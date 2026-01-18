// バックエンド自動選択ロジック
import type { BackendExecutor, BackendType, BackendCapabilities, SelectionCriteria, MemoryInfo } from './types';

export class BackendSelector {
  private backends: Map<BackendType, BackendExecutor> = new Map();
  private capabilities: Map<BackendType, BackendCapabilities> = new Map();
  
  async registerBackend(backend: BackendExecutor): Promise<void> {
    try {
      if (await backend.isAvailable()) {
        this.backends.set(backend.type, backend);
        this.capabilities.set(backend.type, backend.getCapabilities());
        console.log(`[BackendSelector] Registered: ${backend.name}`);
      } else {
        console.log(`[BackendSelector] Skipped (not available): ${backend.name}`);
      }
    } catch (error) {
      console.warn(`[BackendSelector] Failed to register ${backend.name}:`, error);
    }
  }
  
  async selectBest(criteria: SelectionCriteria): Promise<BackendExecutor | null> {
    const available = Array.from(this.backends.values());
    
    if (available.length === 0) {
      console.warn('[BackendSelector] No backends available');
      return null;
    }

    // 優先順位スコアリング
    const scored = await Promise.all(
      available.map(async (backend) => {
        const score = await this.calculateScore(backend, criteria);
        return { backend, score };
      })
    );
    
    // スコア降順でソート
    scored.sort((a, b) => b.score - a.score);
    
    console.log('[BackendSelector] Backend scores:', 
      scored.map(s => ({ name: s.backend.name, score: s.score }))
    );
    
    const selected = scored[0]?.backend || null;
    if (selected) {
      console.log(`[BackendSelector] Selected: ${selected.name}`);
    }
    
    return selected;
  }
  
  /**
   * フォールバック用の優先順リストを返却
   */
  async selectPriorityList(criteria: SelectionCriteria): Promise<BackendType[]> {
    const available = Array.from(this.backends.values());
    
    if (available.length === 0) {
      console.warn('[BackendSelector] No backends available');
      return [];
    }

    // 優先順位スコアリング
    const scored = await Promise.all(
      available.map(async (backend) => {
        const score = await this.calculateScore(backend, criteria);
        return { type: backend.type, score };
      })
    );
    
    // スコア降順でソート（負のスコアは除外）
    const priorityList = scored
      .filter(s => s.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.type);
    
    console.log('[BackendSelector] Priority list:', priorityList);
    
    return priorityList;
  }
  
  private async calculateScore(
    backend: BackendExecutor,
    criteria: SelectionCriteria
  ): Promise<number> {
    let score = 0;
    const caps = this.capabilities.get(backend.type);
    if (!caps) return -1;
    
    // 1. オフライン要求 (重要度: 高)
    if (criteria.preferOffline && caps.supportsOffline) {
      score += 100;
    }
    
    // 2. モデルサイズ対応 (重要度: 高)
    if (criteria.modelSize <= caps.maxModelSize) {
      score += 80;
    } else {
      return -1; // サポート不可
    }
    
    // 3. 速度優先 (重要度: 中)
    if (criteria.prioritizeSpeed) {
      const speedScore: Record<string, number> = { fast: 60, medium: 30, slow: 10 };
      score += speedScore[caps.estimatedSpeed] || 0;
    }
    
    // 4. 機能サポート (重要度: 中)
    if (criteria.needsImageGeneration && caps.supportsImageGeneration) {
      score += 50;
    }
    if (criteria.needsImageProcessing && caps.supportsImageProcessing) {
      score += 40;
    }
    
    // 5. メモリ使用状況 (重要度: 低)
    try {
      const memInfo = await backend.getMemoryUsage();
      if (memInfo.available > 1000) { // 1GB以上空き
        score += 20;
      }
    } catch (error) {
      // メモリ情報取得失敗は無視
    }
    
    return score;
  }
  
  getBackend(type: BackendType): BackendExecutor | undefined {
    return this.backends.get(type);
  }
  
  getAllBackends(): BackendExecutor[] {
    return Array.from(this.backends.values());
  }
  
  getAvailableTypes(): BackendType[] {
    return Array.from(this.backends.keys());
  }
  
  /**
   * 全バックエンドのMapを取得（FallbackEngine用）
   */
  getBackendsMap(): Map<BackendType, BackendExecutor> {
    return new Map(this.backends);
  }
}
