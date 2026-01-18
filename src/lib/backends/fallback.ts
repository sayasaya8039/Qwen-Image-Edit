// フォールバック機構
import type { BackendExecutor, BackendType, GenerationParams } from './types';

// フォールバック条件分類
export enum FallbackReason {
  NOT_AVAILABLE = 'not_available',       // API/デバイス不足
  INIT_FAILED = 'init_failed',           // モデルロード失敗
  OUT_OF_MEMORY = 'out_of_memory',       // メモリ不足
  TRANSIENT = 'transient',               // 一時的エラー
}

// バックエンド状態
export enum BackendStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  HALF_OPEN = 'half_open', // サーキットブレーカー半開状態
}

// フォールバック結果
export interface FallbackResult<T> {
  success: boolean;
  result?: T;
  usedBackend?: BackendType;
  failedBackends: Array<{
    backend: BackendType;
    reason: FallbackReason;
    error: string; // FIXED: Error オブジェクトではなく string に変更
  }>;
  retries: number;
}

// オペレーションメトリクス
export interface OperationMetrics {
  backend: BackendType;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  lastFailureTime?: number;
}

// エラー型ガード
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export class FallbackEngine {
  // FIXED: backends プロパティを追加
  private backends: Map<BackendType, BackendExecutor>;
  private backendStatus: Map<BackendType, BackendStatus> = new Map();
  private metrics: Map<BackendType, OperationMetrics> = new Map();
  private readonly HALF_OPEN_TIMEOUT = 60000; // 1分

  constructor(backends: Map<BackendType, BackendExecutor>) {
    this.backends = backends;
    // 初期状態はすべてAVAILABLE
    for (const type of backends.keys()) {
      this.backendStatus.set(type, BackendStatus.AVAILABLE);
      this.metrics.set(type, {
        backend: type,
        successCount: 0,
        failureCount: 0,
        avgDuration: 0,
      });
    }
  }

  /**
   * フォールバック付きで画像生成を実行
   */
  async executeWithFallback(
    priorityList: BackendType[],
    params: GenerationParams
  ): Promise<FallbackResult<Blob>> {
    const failedBackends: FallbackResult<Blob>['failedBackends'] = [];
    // FIXED: activeParams として新しい参照を使用（入力を変更しない）
    let activeParams = { ...params };

    for (const backendType of priorityList) {
      // 状態チェック
      if (!this.isBackendUsable(backendType)) {
        continue;
      }

      const backend = this.backends.get(backendType);
      if (!backend) continue;

      // FIXED: duration を測定
      const startTime = performance.now();

      try {
        // 初期化（idempotentと仮定）
        await backend.init();
        
        // 画像生成
        const result = await backend.generateImage(activeParams);
        
        const duration = performance.now() - startTime;
        
        // 成功メトリクス更新
        this.updateMetrics(backendType, true, duration);
        this.backendStatus.set(backendType, BackendStatus.AVAILABLE);
        
        return {
          success: true,
          result,
          usedBackend: backendType,
          failedBackends,
          retries: failedBackends.length,
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        const reason = this.classifyError(error);
        
        // FIXED: エラーメッセージのみを保存（スタックトレース除外）
        const errorMessage = isError(error) ? error.message : 'Unknown error';
        console.error(`[FallbackEngine] Backend ${backendType} failed:`, error);
        
        failedBackends.push({
          backend: backendType,
          reason,
          error: errorMessage, // セキュアなメッセージのみ
        });

        // 失敗メトリクス更新
        this.updateMetrics(backendType, false, duration);

        // OUT_OF_MEMORY の場合は設定を自動縮小
        if (reason === FallbackReason.OUT_OF_MEMORY) {
          activeParams = this.degradeParams(activeParams);
          console.warn(`[FallbackEngine] OOM detected, degraded params:`, activeParams);
        }

        // 初期化失敗は即座にUNAVAILABLE
        if (reason === FallbackReason.INIT_FAILED) {
          this.backendStatus.set(backendType, BackendStatus.UNAVAILABLE);
        }

        // 失敗率が高い場合はHALF_OPEN状態にする
        const metrics = this.metrics.get(backendType);
        if (metrics && this.shouldCircuitBreak(metrics)) {
          this.backendStatus.set(backendType, BackendStatus.HALF_OPEN);
          console.warn(`[FallbackEngine] Circuit breaker activated for ${backendType}`);
        }

        // 次のバックエンドへ（FIXED: リトライロジックを削除、自然なフォールバックのみ）
        continue;
      }
    }

    // すべて失敗
    return {
      success: false,
      failedBackends,
      retries: failedBackends.length,
    };
  }

  /**
   * バックエンドが使用可能か確認
   */
  private isBackendUsable(backendType: BackendType): boolean {
    const status = this.backendStatus.get(backendType);
    if (status === BackendStatus.UNAVAILABLE) {
      return false;
    }

    if (status === BackendStatus.HALF_OPEN) {
      const metrics = this.metrics.get(backendType);
      if (metrics?.lastFailureTime) {
        const elapsed = Date.now() - metrics.lastFailureTime;
        if (elapsed < this.HALF_OPEN_TIMEOUT) {
          return false;
        }
        // タイムアウト経過したらAVAILABLEに戻す
        this.backendStatus.set(backendType, BackendStatus.AVAILABLE);
      }
    }

    return true;
  }

  /**
   * エラーを分類
   */
  private classifyError(error: unknown): FallbackReason {
    if (!isError(error)) {
      return FallbackReason.TRANSIENT;
    }

    const message = error.message.toLowerCase();

    if (message.includes('not available') || message.includes('not supported')) {
      return FallbackReason.NOT_AVAILABLE;
    }

    if (message.includes('out of memory') || message.includes('oom')) {
      return FallbackReason.OUT_OF_MEMORY;
    }

    if (message.includes('failed to load') || message.includes('initialization')) {
      return FallbackReason.INIT_FAILED;
    }

    // デフォルトは一時的エラー
    return FallbackReason.TRANSIENT;
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(backendType: BackendType, success: boolean, duration: number): void {
    const metrics = this.metrics.get(backendType);
    if (!metrics) return;

    if (success) {
      metrics.successCount++;
      metrics.avgDuration = (metrics.avgDuration * (metrics.successCount - 1) + duration) / metrics.successCount;
    } else {
      metrics.failureCount++;
      metrics.lastFailureTime = Date.now();
    }

    this.metrics.set(backendType, metrics);
  }

  /**
   * サーキットブレーカーを発動すべきか判定
   */
  private shouldCircuitBreak(metrics: OperationMetrics): boolean {
    const total = metrics.successCount + metrics.failureCount;
    if (total < 5) return false; // 最低5回は試行

    const failureRate = metrics.failureCount / total;
    return failureRate > 0.5; // 失敗率50%以上
  }

  /**
   * パラメータを縮小（OOM対策）
   */
  private degradeParams(params: GenerationParams): GenerationParams {
    return {
      ...params,
      width: Math.max(256, Math.floor((params.width || 512) * 0.75)),
      height: Math.max(256, Math.floor((params.height || 512) * 0.75)),
      steps: Math.max(10, Math.floor((params.steps || 20) * 0.75)),
    };
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): Map<BackendType, OperationMetrics> {
    return new Map(this.metrics);
  }

  /**
   * バックエンドステータスを取得
   */
  getStatus(backendType: BackendType): BackendStatus | undefined {
    return this.backendStatus.get(backendType);
  }
}
