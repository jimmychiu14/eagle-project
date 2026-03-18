/**
 * FinMind API Client
 * 台灣開源金融數據 API - https://finmindtrade.com/
 * 支援 CORS，可直接從瀏覽器調用
 */

import type { StockDailyData, FinMindResponse, StockInfo } from '@/types/stock'

// FinMind API 端點
// 開發環境：使用 Vite proxy (/finmind)
// 生產環境：直接呼叫 FinMind API
const FINMIND_API_BASE = import.meta.env.PROD 
  ? 'https://api.finmindtrade.com/api/v4/data' 
  : '/finmind/api/v4/data'

// Demo token (公開的測試用 token)
// const DEMO_TOKEN = 'demo'

// 股票代碼對應名稱
const STOCK_NAMES: Record<string, string> = {
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

interface FinMindPriceDayData {
  date: string
  stock_id: string
  Trading_Volume: number
  Trading_money: number
  open: number
  max: number
  min: number
  close: number
  spread: number
  Trading_turnover: number
}

interface FinMindStockInfoData {
  stock_id: string
  stock_name: string
  industry: string
  market: string
  listing_date: string
}

class FinMindClient {
  private token: string

  constructor(token?: string) {
    // 如果沒有提供 token，則不傳遞（使用公開數據）
    this.token = token || ''
  }

  /**
   * 設定 API Token
   */
  setToken(token: string) {
    this.token = token
  }

  /**
   * 格式化日期為 YYYY-MM-DD (FinMind API 要求格式)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 取得日期範圍（過去 N 天）
   * FinMind 免費帳號限制：最多查詢 180 天內資料
   */
  private getDateRange(days: number): { start_date: string; end_date: string } {
    const endDate = new Date()
    const startDate = new Date()
    
    // FinMind 限制：最多查 180 天
    const maxDays = Math.min(days, 180)
    startDate.setDate(startDate.getDate() - maxDays)

    return {
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(endDate)
    }
  }

  /**
   * 調用 FinMind API
   */
  private async fetchFinMind<T>(dataset: string, params: Record<string, any>): Promise<T[]> {
    const url = FINMIND_API_BASE

    const queryParams = new URLSearchParams({
      dataset,
      ...params
    })
    
    // 只有在有 token 時才加入
    if (this.token) {
      queryParams.append('token', this.token)
    }

    try {
      const response = await fetch(`${url}?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json: FinMindResponse<T> = await response.json()

      // FinMind API 成功時回傳 msg: "success" (沒有 success 欄位)
      if (json.msg !== 'success' && json.msg !== undefined) {
        console.warn('FinMind API returned error:', json.msg)
        return []
      }

      return json.data || []
    } catch (error) {
      console.error('FinMind API fetch error:', error)
      throw error
    }
  }

  /**
   * 取得股票每日開高低收資料
   * @param stockId 股票代碼 (如: 2330)
   * @param days 回測天數 (預設 120 天)
   */
  async getStockPriceDay(stockId: string, days: number = 120): Promise<StockDailyData[]> {
    const { start_date, end_date } = this.getDateRange(days)

    const data = await this.fetchFinMind<FinMindPriceDayData>('TaiwanStockPrice', {
      data_id: stockId,
      start_date,
      end_date
    })

    // 轉換為所需的格式 (FinMind 回傳的欄位名稱不同)
    return data.map(item => ({
      date: item.date,
      stock_id: item.stock_id,
      open: parseFloat(item.open?.toString() || '0'),
      high: parseFloat(item.max?.toString() || '0'),  // max 是最高價
      low: parseFloat(item.min?.toString() || '0'),   // min 是最低價
      close: parseFloat(item.close?.toString() || '0'),
      volume: parseInt(item.Trading_Volume?.toString() || '0')
    }))
  }

  /**
   * 取得股票基本資訊
   * @param stockId 股票代碼 (如: 2330)
   */
  async getStockInfo(stockId: string): Promise<StockInfo | null> {
    const data = await this.fetchFinMind<FinMindStockInfoData>('TaiwanStockInfo', {
      data_id: stockId
    })

    if (data.length === 0) {
      return null
    }

    const info = data[0]
    return {
      symbol: info.stock_id,
      name: info.stock_name,
      market: info.market,
      type: info.industry
    }
  }

  /**
   * 取得股票名稱
   */
  getStockName(stockId: string): string {
    // 移除 .TW 後綴
    const normalized = stockId.replace('.TW', '')
    return STOCK_NAMES[normalized] || normalized
  }

  /**
   * 測試 API 連線
   */
  async testConnection(): Promise<boolean> {
    try {
      const data = await this.fetchFinMind('TaiwanStockPriceDay', {
        data_id: '2330',
        start_date: this.formatDate(new Date()),
        end_date: this.formatDate(new Date())
      })
      return data.length > 0 || true // 即使沒有資料也視為連線成功
    } catch {
      return false
    }
  }
}

// 匯出單例
export const finMindClient = new FinMindClient()
export default finMindClient
