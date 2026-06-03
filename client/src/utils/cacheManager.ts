/**
 * 缓存管理器
 * 用于 Electron 应用的离线数据缓存
 * 替代 Service Worker 的缓存功能
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // 毫秒
}

class CacheManager {
  private readonly prefix = 'app_cache_';
  private readonly storage = localStorage;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param expiresIn 过期时间（毫秒），默认1小时
   */
  set<T>(key: string, data: T, expiresIn: number = 60 * 60 * 1000): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn,
    };

    try {
      this.storage.setItem(
        this.prefix + key,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.error('Cache set error:', error);
      // 如果存储满了，清理过期缓存
      this.cleanExpired();
      // 重试一次
      try {
        this.storage.setItem(
          this.prefix + key,
          JSON.stringify(cacheItem)
        );
      } catch (retryError) {
        console.error('Cache retry failed:', retryError);
      }
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或过期返回 null
   */
  get<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.prefix + key);

      if (!item) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();

      // 检查是否过期
      if (now - cacheItem.timestamp > cacheItem.expiresIn) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 移除缓存
   * @param key 缓存键
   */
  remove(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    });
  }

  /**
   * 清理过期缓存
   */
  cleanExpired(): void {
    const keys = Object.keys(this.storage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const item = this.storage.getItem(key);
          if (item) {
            const cacheItem: CacheItem<any> = JSON.parse(item);
            if (now - cacheItem.timestamp > cacheItem.expiresIn) {
              this.storage.removeItem(key);
            }
          }
        } catch (error) {
          // 如果解析失败，删除这个损坏的缓存
          this.storage.removeItem(key);
        }
      }
    });
  }

  /**
   * 获取缓存大小
   * @returns 缓存项数量
   */
  size(): number {
    const keys = Object.keys(this.storage);
    return keys.filter(key => key.startsWith(this.prefix)).length;
  }

  /**
   * 获取缓存信息
   */
  info(): { total: number; expired: number; valid: number } {
    const keys = Object.keys(this.storage);
    const now = Date.now();
    let total = 0;
    let expired = 0;
    let valid = 0;

    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        total++;
        try {
          const item = this.storage.getItem(key);
          if (item) {
            const cacheItem: CacheItem<any> = JSON.parse(item);
            if (now - cacheItem.timestamp > cacheItem.expiresIn) {
              expired++;
            } else {
              valid++;
            }
          }
        } catch (error) {
          expired++;
        }
      }
    });

    return { total, expired, valid };
  }

  /**
   * 带缓存的数据获取
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param expiresIn 过期时间
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresIn?: number
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存不存在或过期，重新获取
    const data = await fetcher();
    this.set(key, data, expiresIn);
    return data;
  }
}

// 导出单例
export const cacheManager = new CacheManager();

// React Hook 封装
export function useCache() {
  return {
    set: cacheManager.set.bind(cacheManager),
    get: cacheManager.get.bind(cacheManager),
    remove: cacheManager.remove.bind(cacheManager),
    clear: cacheManager.clear.bind(cacheManager),
    cleanExpired: cacheManager.cleanExpired.bind(cacheManager),
    size: cacheManager.size.bind(cacheManager),
    info: cacheManager.info.bind(cacheManager),
    getOrFetch: cacheManager.getOrFetch.bind(cacheManager),
  };
}

// 带 React Query 风格的数据获取 Hook
import { useState, useEffect } from 'react';

interface UseCachedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  expiresIn?: number;
  enabled?: boolean;
}

export function useCachedData<T>({
  key,
  fetcher,
  expiresIn,
  enabled = true,
}: UseCachedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await cacheManager.getOrFetch(key, fetcher, expiresIn);
        if (!cancelled) {
          setData(result);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  const refetch = async () => {
    setLoading(true);
    setError(null);

    try {
      // 强制重新获取，忽略缓存
      cacheManager.remove(key);
      const result = await fetcher();
      cacheManager.set(key, result, expiresIn);
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}
