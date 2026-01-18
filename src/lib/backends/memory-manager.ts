// メモリ管理システム
import type { BackendExecutor, BackendType, MemoryInfo } from './types';

export interface MemoryManagerConfig {
  maxTotalMemory: number; // MB（総メモリ上限）
  singleModelLimit: number; // MB（単一モデル上限）
  reservedMemory: number; // MB（システム予約メモリ）
  memoryRefreshInterval: number; // ms（メモリ使用量更新間隔）
}

interface BackendMemoryEntry {
  backend: BackendExecutor;
  lastUsed: number; // timestamp
  memoryUsed: number; // MB
  initialized: boolean;
  lastMemoryCheck: number; // timestamp（最終メモリ確認時刻）
}

export class MemoryManager {
  private backends: Map<BackendType, BackendMemoryEntry> = new Map();
  private config: MemoryManagerConfig;
  private activeBackend: BackendType | null = null;
  private lock = Promise.resolve(); // async mutex for atomic operations
  private memoryRefreshTimer: number | null = null;

  constructor(config?: Partial<MemoryManagerConfig>) {
    const defaultConfig = {
      maxTotalMemory: this.getDeviceMemory(),
      singleModelLimit: 2000, // MB
      reservedMemory: 512, // MB（システム予約）
      memoryRefreshInterval: 5000, // 5秒ごとにメモリ更新
    };
    
    this.config = {
      ...defaultConfig,
      ...config,
    };
    
    // 設定値の検証
    this.validateConfig();
    
    console.log('[MemoryManager] Initialized with config:', this.config);
    
    // 定期的なメモリ更新を開始
    this.startMemoryRefresh();
  }

  private validateConfig(): void {
    if (this.config.singleModelLimit > this.config.maxTotalMemory) {
      throw new Error(
        `Invalid config: singleModelLimit (${this.config.singleModelLimit}MB) ` +
        `exceeds maxTotalMemory (${this.config.maxTotalMemory}MB)`
      );
    }
    
    if (this.config.reservedMemory > this.config.maxTotalMemory) {
      throw new Error(
        `Invalid config: reservedMemory (${this.config.reservedMemory}MB) ` +
        `exceeds maxTotalMemory (${this.config.maxTotalMemory}MB)`
      );
    }
    
    if (this.config.singleModelLimit + this.config.reservedMemory > this.config.maxTotalMemory) {
      console.warn(
        `[MemoryManager] Warning: singleModelLimit + reservedMemory ` +
        `(${this.config.singleModelLimit + this.config.reservedMemory}MB) ` +
        `exceeds maxTotalMemory (${this.config.maxTotalMemory}MB)`
      );
    }
  }

  private startMemoryRefresh(): void {
    if (typeof window === 'undefined') return; // Node.js環境では無効
    
    this.memoryRefreshTimer = window.setInterval(async () => {
      await this.refreshAllMemoryUsage();
    }, this.config.memoryRefreshInterval);
  }

  private async refreshAllMemoryUsage(): Promise<void> {
    for (const [type, entry] of this.backends.entries()) {
      if (entry.initialized) {
        try {
          const memInfo = await entry.backend.getMemoryUsage();
          entry.memoryUsed = memInfo.used;
          entry.lastMemoryCheck = Date.now();
        } catch (error) {
          console.warn(`[MemoryManager] Failed to refresh memory for ${type}:`, error);
        }
      }
    }
  }

  /**
   * デバイスメモリ容量を取得
   */
  private getDeviceMemory(): number {
    // navigator.deviceMemory (GB) から推定
    const deviceMemory = (navigator as any).deviceMemory || 4; // デフォルト4GB
    const estimatedHeap = deviceMemory * 1024 * 0.7; // 70%をヒープとして使用可能と仮定
    
    console.log(`[MemoryManager] Device memory: ${deviceMemory}GB, Estimated heap: ${Math.round(estimatedHeap)}MB`);
    
    return Math.round(estimatedHeap);
  }

  /**
   * バックエンドを登録
   */
  async register(backend: BackendExecutor): Promise<void> {
    this.backends.set(backend.type, {
      backend,
      lastUsed: 0,
      memoryUsed: 0,
      initialized: false,
      lastMemoryCheck: 0,
    });
    console.log(`[MemoryManager] Registered backend: ${backend.name}`);
  }

  /**
   * バックエンドを取得（自動メモリ管理）
   */
  async acquire(backendType: BackendType): Promise<BackendExecutor | null> {
    // FIXED: Mutex pattern to prevent race conditions
    return this.lock = this.lock.then(async () => {
      const entry = this.backends.get(backendType);
      if (!entry) {
        console.warn(`[MemoryManager] Backend not registered: ${backendType}`);
        return null;
      }

      const requiredMemory = this.config.singleModelLimit;
      let availableMemory = await this.getCurrentAvailableMemory();

      console.log(`[MemoryManager] Acquire ${backendType}: Required ${requiredMemory}MB, Available ${availableMemory}MB`);

      // FIXED: Ensure memory available, throw error if impossible
      if (availableMemory < requiredMemory) {
        console.warn('[MemoryManager] Insufficient memory, attempting eviction');
        await this.ensureMemoryAvailable(requiredMemory);
        
        // Re-check after eviction
        availableMemory = await this.getCurrentAvailableMemory();
        if (availableMemory < requiredMemory) {
          throw new Error(
            `Cannot acquire ${backendType}: insufficient memory after eviction ` +
            `(required: ${requiredMemory}MB, available: ${availableMemory}MB)`
          );
        }
      }

      // 初期化（必要な場合）
      if (!entry.initialized) {
        try {
          await entry.backend.init();
          entry.initialized = true;
          
          const memInfo = await entry.backend.getMemoryUsage();
          entry.memoryUsed = memInfo.used;
          entry.lastMemoryCheck = Date.now();
        } catch (error) {
          console.error(`[MemoryManager] Failed to initialize ${backendType}:`, error);
          throw error;
        }
      }

      entry.lastUsed = Date.now();
      this.activeBackend = backendType;

      console.log(`[MemoryManager] Acquired ${backendType}, Memory used: ${entry.memoryUsed}MB`);

      return entry.backend;
    });
  }

  /**
   * バックエンドを解放（明示的）
   */
  async release(backendType: BackendType): Promise<void> {
    const entry = this.backends.get(backendType);
    if (!entry || !entry.initialized) {
      return;
    }

    try {
      await entry.backend.dispose();
      entry.initialized = false;
      entry.memoryUsed = 0;
      entry.lastMemoryCheck = 0;
      
      if (this.activeBackend === backendType) {
        this.activeBackend = null;
      }

      console.log(`[MemoryManager] Released ${backendType}`);
    } catch (error) {
      console.error(`[MemoryManager] Failed to release ${backendType}:`, error);
    }
  }

  // FIXED: Allow evicting active backend when necessary
  private async ensureMemoryAvailable(requiredSpace: number): Promise<void> {
    const sortedEntries = Array.from(this.backends.entries())
      .filter(([_, entry]) => entry.initialized)
      .sort(([_, a], [__, b]) => a.lastUsed - b.lastUsed);

    let freedSpace = 0;
    const evictionTargets: BackendType[] = [];

    // First pass: collect eviction targets (excluding active)
    for (const [type, entry] of sortedEntries) {
      if (type === this.activeBackend) {
        continue; // Skip active in first pass
      }
      
      evictionTargets.push(type);
      freedSpace += entry.memoryUsed;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    // Second pass: if still insufficient, include active backend
    if (freedSpace < requiredSpace && this.activeBackend) {
      const activeEntry = this.backends.get(this.activeBackend);
      if (activeEntry && activeEntry.initialized) {
        console.warn(`[MemoryManager] Must evict active backend ${this.activeBackend} to free memory`);
        evictionTargets.push(this.activeBackend);
        freedSpace += activeEntry.memoryUsed;
      }
    }

    // Execute evictions
    for (const type of evictionTargets) {
      const entry = this.backends.get(type);
      if (!entry) continue;
      
      console.log(`[MemoryManager] Evicting ${type} (LRU: ${new Date(entry.lastUsed).toISOString()})`);
      await this.release(type);
    }

    // FIXED: Throw error if still insufficient
    if (freedSpace < requiredSpace) {
      throw new Error(
        `Insufficient memory: could only free ${freedSpace}MB out of ${requiredSpace}MB required`
      );
    }

    console.log(`[MemoryManager] Freed ${freedSpace}MB (target: ${requiredSpace}MB)`);
  }

  // FIXED: Get real-time memory usage instead of cached value
  private async getCurrentAvailableMemory(): Promise<number> {
    // Refresh memory usage for all initialized backends
    let totalUsed = 0;
    
    for (const entry of this.backends.values()) {
      if (entry.initialized) {
        try {
          const memInfo = await entry.backend.getMemoryUsage();
          entry.memoryUsed = memInfo.used;
          entry.lastMemoryCheck = Date.now();
          totalUsed += entry.memoryUsed;
        } catch (error) {
          console.warn('[MemoryManager] Failed to get memory usage:', error);
          totalUsed += entry.memoryUsed; // Use cached value as fallback
        }
      }
    }

    const available = this.config.maxTotalMemory - this.config.reservedMemory - totalUsed;
    
    return Math.max(0, available);
  }

  /**
   * 総メモリ情報を取得
   */
  async getTotalMemoryInfo(): Promise<MemoryInfo> {
    let totalUsed = 0;
    let peakUsed = 0;

    for (const entry of this.backends.values()) {
      if (entry.initialized) {
        const memInfo = await entry.backend.getMemoryUsage();
        totalUsed += memInfo.used;
        peakUsed = Math.max(peakUsed, memInfo.peak);
      }
    }

    const available = await this.getCurrentAvailableMemory();

    return {
      used: Math.round(totalUsed),
      available: Math.round(available),
      peak: Math.round(peakUsed),
    };
  }

  /**
   * すべてのバックエンドを解放
   */
  async releaseAll(): Promise<void> {
    console.log('[MemoryManager] Releasing all backends');
    
    // Stop memory refresh timer
    if (this.memoryRefreshTimer !== null) {
      clearInterval(this.memoryRefreshTimer);
      this.memoryRefreshTimer = null;
    }
    
    for (const [type, _] of this.backends) {
      await this.release(type);
    }
    
    this.activeBackend = null;
  }

  /**
   * メモリ制限を強制適用
   */
  async enforceMemoryLimit(): Promise<void> {
    const available = await this.getCurrentAvailableMemory();
    
    if (available < 0) {
      console.warn('[MemoryManager] Memory limit exceeded, enforcing eviction');
      await this.ensureMemoryAvailable(Math.abs(available) + 100); // +100MB のマージン
    }
  }

  /**
   * バックエンドの状態を取得
   */
  getBackendStatus(backendType: BackendType): BackendMemoryEntry | undefined {
    return this.backends.get(backendType);
  }

  /**
   * すべてのバックエンド状態を取得
   */
  getAllStatus(): Map<BackendType, BackendMemoryEntry> {
    return new Map(this.backends);
  }
}
