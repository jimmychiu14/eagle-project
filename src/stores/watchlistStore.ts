/**
 * 觀察名單 Store
 * 使用 localStorage 儲存觀察名單
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface WatchlistItem {
  id: string           // 股票代碼，如 '2330.TW'
  name: string         // 股票名稱
  addedAt: number      // 加入時間戳
  price?: number       // 目前價格
  change?: number      // 漲跌
  changePercent?: number // 漲跌幅%
  alertThreshold?: number // 價格提醒門檻（%）
}

const STORAGE_KEY = 'eagle_watchlist'

export const useWatchlistStore = defineStore('watchlist', () => {
  const watchlist = ref<WatchlistItem[]>([])
  
  // 從 localStorage 載入
  function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        watchlist.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load watchlist:', e)
        watchlist.value = []
      }
    }
  }
  
  // 儲存到 localStorage
  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist.value))
  }
  
  // 監聽變化自動儲存
  watch(watchlist, saveToStorage, { deep: true })
  
  // 初始化
  loadFromStorage()
  
  // 檢查股票是否已在觀察名單中
  const isInWatchlist = computed(() => (stockId: string) => {
    return watchlist.value.some(item => item.id === stockId)
  })
  
  // 新增股票到觀察名單
  function addToWatchlist(id: string, name: string) {
    if (isInWatchlist.value(id)) {
      return false // 已在名單中
    }
    
    watchlist.value.unshift({
      id,
      name,
      addedAt: Date.now()
    })
    return true
  }
  
  // 從觀察名單移除
  function removeFromWatchlist(id: string) {
    const index = watchlist.value.findIndex(item => item.id === id)
    if (index !== -1) {
      watchlist.value.splice(index, 1)
      return true
    }
    return false
  }
  
  // 更新股票價格資訊
  function updateStockPrice(id: string, price: number, change: number, changePercent: number) {
    const item = watchlist.value.find(w => w.id === id)
    if (item) {
      item.price = price
      item.change = change
      item.changePercent = changePercent
    }
  }
  
  // 設定價格提醒門檻
  function setAlertThreshold(id: string, threshold: number) {
    const item = watchlist.value.find(w => w.id === id)
    if (item) {
      item.alertThreshold = threshold
      return true
    }
    return false
  }
  
  // 檢查是否觸發價格提醒
  function checkPriceAlert(id: string): WatchlistItem | null {
    const item = watchlist.value.find(w => w.id === id)
    if (item && item.price && item.alertThreshold && item.changePercent !== undefined) {
      if (Math.abs(item.changePercent) >= item.alertThreshold) {
        return item
      }
    }
    return null
  }
  
  // 清除所有觀察名單
  function clearWatchlist() {
    watchlist.value = []
  }
  
  return {
    watchlist,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateStockPrice,
    setAlertThreshold,
    checkPriceAlert,
    clearWatchlist,
    loadFromStorage
  }
})
