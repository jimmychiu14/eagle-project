import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { finMindClient } from '@/services/api/finmindClient'
import { twseFinancialClient } from '@/services/api/twseFinancialClient'
import { generateMockStockData, generateMockFinancialData } from '@/utils/mockData'
import type { FinancialData } from '@/types/stock'

interface StockData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const useStockStore = defineStore('stock', () => {
  const stockData = ref<StockData[]>([])
  const currentStockId = ref<string>('')
  const currentStockName = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const latestQuote = ref<any>(null)
  const financialData = ref<FinancialData | null>(null)

  // 股票代碼對應名稱
  const stockNames: Record<string, string> = {
    '2330': '台積電',
    '6770': '力積電',
    '2317': '鴻海',
    '2454': '聯發科',
    '2881': '富邦金',
    '0050': '元大台灣50',
    '2303': '聯電',
    '3008': '大立光',
    '2002': '中鋼',
    '5880': '合庫金'
  }

  const latestPrice = computed(() => {
    if (stockData.value.length === 0) return null
    return stockData.value[stockData.value.length - 1]
  })

  const priceChange = computed(() => {
    if (!latestQuote.value) return null
    return {
      value: latestQuote.value.change,
      percent: latestQuote.value.changePercent
    }
  })

  /**
   * 取得股票名稱
   */
  function getStockName(stockId: string): string {
    const normalized = stockId.replace('.TW', '')
    return stockNames[normalized] || normalized
  }

  async function fetchStockData(stockId: string, range: string = '3mo') {
    isLoading.value = true
    error.value = null
    
    try {
      // 標準化股票代碼
      const normalizedId = stockId.replace('.TW', '')
      currentStockId.value = stockId
      currentStockName.value = getStockName(stockId)
      
      // 根據 range 決定取得的天數
      const daysMap: Record<string, number> = {
        '1m': 30,
        '3mo': 90,
        '6mo': 180,
        '1y': 365,
        '2y': 730,
        '5y': 1825
      }
      const days = daysMap[range] || 90

      // 使用 FinMind API 取得股票資料
      const priceData = await finMindClient.getStockPriceDay(normalizedId, days)
      
      if (priceData && priceData.length > 0) {
        // 轉換資料格式
        stockData.value = priceData.map(item => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }))

        // 計算最新報價資訊
        const latest = priceData[priceData.length - 1]
        const previous = priceData.length > 1 ? priceData[priceData.length - 2] : latest
        
        latestQuote.value = {
          price: latest.close,
          change: latest.close - previous.close,
          changePercent: ((latest.close - previous.close) / previous.close) * 100,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          volume: latest.volume
        }
      } else {
        // Fallback to mock data if API returns no data
        console.warn('FinMind API returned no data, using mock data')
        stockData.value = generateMockStockData(stockId, 120)
        financialData.value = generateMockFinancialData(stockId)
      }
      
      // 嘗試取得股票基本資訊
      try {
        const stockInfo = await finMindClient.getStockInfo(normalizedId)
        if (stockInfo) {
          currentStockName.value = stockInfo.name
        }
      } catch (infoError) {
        console.warn('Failed to fetch stock info:', infoError)
      }
      
      // 嘗試從 TWSE API 取得真實財報資料
      try {
        const latestPrice = stockData.value.length > 0 ? stockData.value[stockData.value.length - 1].close : undefined
        const twseFinancial = await twseFinancialClient.getFinancialData(normalizedId, latestPrice)
        
        if (twseFinancial) {
          financialData.value = twseFinancial
          console.log(`[${normalizedId}] 使用 TWSE 真實財報資料`)
        } else {
          // TWSE API 失敗，回退使用 mock
          console.warn(`[${normalizedId}] TWSE API 無回傳，使用 mock 財報`)
          financialData.value = generateMockFinancialData(stockId)
        }
      } catch (financialError) {
        console.warn('Failed to fetch TWSE financial data:', financialError)
        // API 錯誤，使用 mock
        financialData.value = generateMockFinancialData(stockId)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch stock data'
      console.error('Stock data fetch error:', e)
      // Fallback to mock data on error
      stockData.value = generateMockStockData(stockId, 120)
      financialData.value = generateMockFinancialData(stockId)
    } finally {
      isLoading.value = false
    }
  }

  function clearData() {
    stockData.value = []
    currentStockId.value = ''
    currentStockName.value = ''
    error.value = null
    latestQuote.value = null
    financialData.value = null
  }

  return {
    stockData,
    currentStockId,
    currentStockName,
    isLoading,
    error,
    latestPrice,
    priceChange,
    financialData,
    fetchStockData,
    clearData
  }
})
