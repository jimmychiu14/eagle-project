import axios, { AxiosInstance, AxiosError } from 'axios'
import type { StockDailyData, FinMindResponse } from '@/types/stock'

const BASE_URL = '/finmind'

interface TransHistoryParams {
  stock_id: string
  start_date: string
  end_date: string
  data_id?: string
  user_agent?: string
}

class FinMindClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * 取得股票每日行情數據
   * @param stockId 股票代碼 (如: 2330)
   * @param startDate 開始日期 (YYYY-MM-DD)
   * @param endDate 結束日期 (YYYY-MM-DD)
   */
  async getStockDaily(
    stockId: string,
    startDate: string,
    endDate: string
  ): Promise<StockDailyData[]> {
    try {
      const response = await this.client.get<FinMindResponse<StockDailyData>>('/', {
        params: {
          dataset: 'TaiwanStockPrice',
          user_agent: 'Mozilla/5.0',
          stock_id: stockId,
          start_date: startDate,
          end_date: endDate
        } as TransHistoryParams
      })

      if (response.data.success && response.data.data) {
        return response.data.data
      }

      throw new Error(response.data.msg || 'Failed to fetch stock data')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError
        if (axiosError.response) {
          throw new Error(`API Error: ${axiosError.response.status} - ${axiosError.response.statusText}`)
        } else if (axiosError.request) {
          throw new Error('Network Error: No response received')
        }
      }
      throw error
    }
  }
}

export const finMindClient = new FinMindClient()
export default finMindClient
