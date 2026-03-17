import type { CacheOptions } from '@/types/stock'

interface CacheEntry<T> {
  data: T
  expiry: number
}

class DataCache {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes

  /**
   * 取得快取資料
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key)
    if (memEntry && memEntry.expiry > Date.now()) {
      return memEntry.data as T
    }

    // Check localStorage
    const lsKey = `eagle_cache_${key}`
    const lsData = localStorage.getItem(lsKey)
    if (lsData) {
      try {
        const lsEntry: CacheEntry<T> = JSON.parse(lsData)
        if (lsEntry.expiry > Date.now()) {
          // Promote to memory cache
          this.memoryCache.set(key, lsEntry as CacheEntry<unknown>)
          return lsEntry.data
        }
        // Expired, remove from localStorage
        localStorage.removeItem(lsKey)
      } catch {
        localStorage.removeItem(lsKey)
      }
    }

    return null
  }

  /**
   * 設定快取資料
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl ?? this.defaultTTL
    const expiry = Date.now() + ttl

    // Store in memory
    this.memoryCache.set(key, { data, expiry })

    // Store in localStorage if enabled
    if (options?.useLocalStorage !== false) {
      const lsKey = `eagle_cache_${key}`
      try {
        localStorage.setItem(lsKey, JSON.stringify({ data, expiry }))
      } catch (e) {
        console.warn('Failed to write to localStorage:', e)
      }
    }
  }

  /**
   * 刪除快取
   */
  delete(key: string): void {
    this.memoryCache.delete(key)
    localStorage.removeItem(`eagle_cache_${key}`)
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.memoryCache.clear()
    // Clear only eagle cache keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('eagle_cache_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

export const dataCache = new DataCache()
export default dataCache
