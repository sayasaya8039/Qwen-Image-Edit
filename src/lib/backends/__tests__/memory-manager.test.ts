// MemoryManagerのテスト
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryManager } from '../memory-manager';
import type { BackendExecutor, BackendType, BackendCapabilities, GenerationParams, MemoryInfo } from '../types';

// モックバックエンド
class MockBackend implements BackendExecutor {
  readonly name: string;
  readonly type: BackendType;
  private memoryUsage: number;
  private initCalled = false;

  constructor(name: string, type: BackendType, memoryUsage: number = 500) {
    this.name = name;
    this.type = type;
    this.memoryUsage = memoryUsage;
  }

  async init(): Promise<void> {
    this.initCalled = true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getCapabilities(): BackendCapabilities {
    return {
      supportsImageGeneration: true,
      supportsImageProcessing: false,
      supportsOffline: true,
      maxModelSize: 2000,
      estimatedSpeed: 'fast',
    };
  }

  async generateImage(_params: GenerationParams): Promise<Blob> {
    return new Blob(['test'], { type: 'image/png' });
  }

  async dispose(): Promise<void> {
    this.initCalled = false;
  }

  async getMemoryUsage(): Promise<MemoryInfo> {
    return {
      used: this.memoryUsage,
      available: 1000,
      peak: this.memoryUsage,
    };
  }

  isInitialized(): boolean {
    return this.initCalled;
  }

  setMemoryUsage(usage: number): void {
    this.memoryUsage = usage;
  }
}

describe('MemoryManager', () => {
  let manager: MemoryManager;
  let backend1: MockBackend;
  let backend2: MockBackend;
  let backend3: MockBackend;

  beforeEach(() => {
    // モック: window.setInterval/clearInterval
    global.window = {
      setInterval: vi.fn(() => 123),
      clearInterval: vi.fn(),
    } as any;

    // モック: navigator.deviceMemory
    (global.navigator as any) = {
      deviceMemory: 4,
    };

    manager = new MemoryManager({
      maxTotalMemory: 3000,
      singleModelLimit: 1500,
      reservedMemory: 500,
      memoryRefreshInterval: 5000,
    });

    backend1 = new MockBackend('Backend1', 'transformers-wasm' as BackendType, 500);
    backend2 = new MockBackend('Backend2', 'transformers-webgpu' as BackendType, 800);
    backend3 = new MockBackend('Backend3', 'cloud' as BackendType, 1000);
  });

  describe('基本機能', () => {
    it('バックエンドを登録できる', async () => {
      await manager.register(backend1);
      const status = manager.getBackendStatus(backend1.type);
      expect(status).toBeDefined();
      expect(status?.backend).toBe(backend1);
    });

    it('バックエンドを取得して初期化できる', async () => {
      await manager.register(backend1);
      const acquired = await manager.acquire(backend1.type);
      
      expect(acquired).toBe(backend1);
      expect(backend1.isInitialized()).toBe(true);
    });

    it('バックエンドを解放できる', async () => {
      await manager.register(backend1);
      await manager.acquire(backend1.type);
      await manager.release(backend1.type);
      
      expect(backend1.isInitialized()).toBe(false);
    });
  });

  describe('設定値検証', () => {
    it('singleModelLimit > maxTotalMemory でエラー', () => {
      expect(() => {
        new MemoryManager({
          maxTotalMemory: 1000,
          singleModelLimit: 2000,
          reservedMemory: 500,
        });
      }).toThrow('Invalid config');
    });

    it('reservedMemory > maxTotalMemory でエラー', () => {
      expect(() => {
        new MemoryManager({
          maxTotalMemory: 1000,
          singleModelLimit: 500,
          reservedMemory: 1500,
        });
      }).toThrow('Invalid config');
    });
  });

  describe('LRU退避', () => {
    it('メモリ不足時に最も古いバックエンドを退避', async () => {
      await manager.register(backend1);
      await manager.register(backend2);
      await manager.register(backend3);

      // Backend1を取得（lastUsed更新）
      await manager.acquire(backend1.type);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Backend2を取得
      await manager.acquire(backend2.type);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Backend3を取得（メモリ不足でBackend1が退避される）
      backend3.setMemoryUsage(1400);
      await manager.acquire(backend3.type);

      expect(backend1.isInitialized()).toBe(false); // 退避された
      expect(backend2.isInitialized()).toBe(true);  // アクティブ
      expect(backend3.isInitialized()).toBe(true);  // 新規
    });

    it('activeバックエンドも退避可能（deadlock対策）', async () => {
      await manager.register(backend1);
      await manager.register(backend2);

      // Backend1を取得（active）
      await manager.acquire(backend1.type);
      backend1.setMemoryUsage(1400);

      // Backend2が大きすぎてactiveも退避必要
      backend2.setMemoryUsage(1400);
      await manager.acquire(backend2.type);

      // Backend1は退避されている
      expect(backend1.isInitialized()).toBe(false);
      expect(backend2.isInitialized()).toBe(true);
    });

    it('退避してもメモリ不足なら例外throw', async () => {
      await manager.register(backend1);
      backend1.setMemoryUsage(3000); // 巨大すぎる

      await expect(manager.acquire(backend1.type)).rejects.toThrow('insufficient memory');
    });
  });

  describe('メモリ管理', () => {
    it('総メモリ情報を取得できる', async () => {
      await manager.register(backend1);
      await manager.register(backend2);
      await manager.acquire(backend1.type);
      await manager.acquire(backend2.type);

      const memInfo = await manager.getTotalMemoryInfo();
      expect(memInfo.used).toBeGreaterThan(0);
      expect(memInfo.available).toBeGreaterThanOrEqual(0);
    });

    it('enforceMemoryLimit でメモリ制限を強制', async () => {
      await manager.register(backend1);
      await manager.register(backend2);
      await manager.acquire(backend1.type);
      await manager.acquire(backend2.type);

      // メモリ使用量を増やす
      backend1.setMemoryUsage(2000);
      backend2.setMemoryUsage(2000);

      await manager.enforceMemoryLimit();

      // どちらかが退避されている
      const allInitialized = backend1.isInitialized() && backend2.isInitialized();
      expect(allInitialized).toBe(false);
    });
  });

  describe('releaseAll', () => {
    it('すべてのバックエンドを解放', async () => {
      await manager.register(backend1);
      await manager.register(backend2);
      await manager.acquire(backend1.type);
      await manager.acquire(backend2.type);

      await manager.releaseAll();

      expect(backend1.isInitialized()).toBe(false);
      expect(backend2.isInitialized()).toBe(false);
    });

    it('メモリ更新タイマーを停止', async () => {
      await manager.releaseAll();
      expect(window.clearInterval).toHaveBeenCalled();
    });
  });
});
