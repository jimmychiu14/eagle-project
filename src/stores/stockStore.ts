import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { yahooFinance } from '@/services/api/yahooClient'

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

  const latestPrice = computed(() => {
    if (stockData.value.length === 0) return null
    return stockData.value[stockData.value.length - 1]
  })

  const priceChange = computed(() => {
    if (!latestQuote.value) return null
    return {
      value: latestQuote.value.regularMarketChange,
      percent: latestQuote.value.regularMarketChangePercent
    }
  })

  async function fetchStockData(stockId: string, range: string = '3mo') {
    isLoading.value = true
    error.value = null
    
    try {
      // Fetch both quote info and historical data
      const [quote, history] = await Promise.all([
        yahooFinance.getQuoteInfo(stockId),
        yahooFinance.getStockDaily(stockId, range)
      ])
      
      latestQuote.value = quote
      currentStockId.value = stockId
      currentStockName.value = quote.shortName
      
      stockData.value = history.map(item => ({
        date: new Date(item.date * 1000).toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch stock data'
      stockData.value = []
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
  }

  return {
    stockData,
    currentStockId,
    currentStockName,
    isLoading,
    error,
    latestPrice,
    priceChange,
    fetchStockData,
    clearData
  }
})
