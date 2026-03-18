/**
 * TWSE (台灣證券交易所) API Client
 * 直接從 TWSE API 取得股票資料
 */

interface TWSEDailyData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TWSEFinancialData {
  pe: number           // 本益比
  dividendYield: number // 殖利率
  pb: number          // 股價淨值比
  eps: number         // 每股盈餘
  '52wHigh': number      // 52週最高
  '52wLow': number       // 52週最低
}

class TWSEClient {
  private baseUrl = 'https://www.twse.com.tw'

  /**
   * 取得股票代碼（移除 .TW 後綴）
   */
  private normalizeStockId(stockId: string): string {
    return stockId.replace('.TW', '').replace(/^00/, '')
  }

  /**
   * 格式化日期為 YYYYMMDD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * 取得最近交易日（排除週末）
   */
  private getRecentTradingDate(date: Date = new Date()): string {
    // 如果是週末，回溯到上個交易日
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1)
    }
    return this.formatDate(date)
  }

  /**
   * 轉換民國日期為西元日期 (如 115/03/18 -> 2026-03-18)
   */
  private convertRocDate(rocDate: string): string {
    // 民國年轉西元年
    const parts = rocDate.split('/')
    if (parts.length === 3) {
      const westernYear = parseInt(parts[0]) + 1911
      return `${westernYear}-${parts[1]}-${parts[2]}`
    }
    return rocDate
  }

  /**
   * 取得每日成交資訊（K線資料）
   * @param stockId 股票代碼（如 2330 或 2330.TW）
   * @param date 日期（YYYYMMDD），預設為最近交易日
   */
  async getDailyData(stockId: string): Promise<TWSEDailyData[]> {
    const stockNo = this.normalizeStockId(stockId)
    
    // 嘗試取得多個月的資料
    const allData: TWSEDailyData[] = []
    const currentDate = new Date()
    
    // 取得最近 6 個月的資料
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(currentDate)
      targetDate.setMonth(targetDate.getMonth() - i)
      const queryDateStr = this.formatDate(targetDate)
      
      try {
        const url = `${this.baseUrl}/rwd/zh/afterTrading/STOCK_DAY?date=${queryDateStr}&stockNo=${stockNo}&response=json`
        
        const response = await fetch(url)
        if (!response.ok) throw new Error('Network error')
        
        const json: any = await response.json()
        
        if (json.stat === 'OK' && json.data && json.data.length > 0) {
          const data = json.data.map((row: any[]) => ({
            date: this.convertRocDate(row[0]), // 轉換民國日期為西元
            open: parseFloat(row[3]?.replace(/,/g, '')) || 0,
            high: parseFloat(row[4]?.replace(/,/g, '')) || 0,
            low: parseFloat(row[5]?.replace(/,/g, '')) || 0,
            close: parseFloat(row[6]?.replace(/,/g, '')) || 0,
            volume: parseInt(row[2]?.replace(/,/g, '')) || 0
          }))
          
          // 過濾有效的日期
          const validData = data.filter(d => d.close > 0 && d.date)
          allData.push(...validData)
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${queryDateStr}:`, error)
      }
    }
    
    // 去除重複並按日期排序
    const uniqueData = allData.reduce((acc: TWSEDailyData[], item) => {
      if (!acc.find(d => d.date === item.date)) {
        acc.push(item)
      }
      return acc
    }, [])
    
    return uniqueData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * 取得個股基本資料（本益比、殖利率、股價淨值比）
   * @param stockId 股票代碼
   * @param date 日期（YYYYMMDD），預設為最近交易日
   */
  async getFinancialData(stockId: string, date?: string): Promise<TWSEFinancialData | null> {
    const stockNo = this.normalizeStockId(stockId)
    const queryDate = date || this.getRecentTradingDate()
    
    try {
      const url = `${this.baseUrl}/rwd/zh/afterTrading/BWIBBU_d?date=${queryDate}&stockNo=${stockNo}&response=json`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network error')
      
      const json: any = await response.json()
      
      if (json.stat === 'OK' && json.data && json.data.length > 0) {
        const row = json.data[0]
        return {
          pe: parseFloat(row[5]) || 0,           // 本益比
          dividendYield: parseFloat(row[6]) || 0, // 殖利率
          pb: parseFloat(row[7]) || 0,            // 股價淨值比
          eps: parseFloat(row[4]) || 0,           // 每股盈餘
          '52wHigh': parseFloat(row[2]) || 0,       // 52週最高價
          '52wLow': parseFloat(row[3]) || 0        // 52週最低價
        }
      }
      
      return null
    } catch (error) {
      console.warn('Failed to fetch financial data:', error)
      return null
    }
  }

  /**
   * 取得即時報價
   * @param stockId 股票代碼
   */
  async getQuote(stockId: string): Promise<{
    price: number
    change: number
    changePercent: number
    open: number
    high: number
    low: number
    volume: number
  } | null> {
    try {
      const stockNo = this.normalizeStockId(stockId)
      const url = `${this.baseUrl}/rwd/zh/afterTrading/STOCK_DAY?date=${this.getRecentTradingDate()}&stockNo=${stockNo}&response=json`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network error')
      
      const json: any = await response.json()
      
      if (json.stat === 'OK' && json.data && json.data.length > 0) {
        const row = json.data[json.data.length - 1] // 最新的資料
        const price = parseFloat(row[6]?.replace(/,/g, '')) || 0
        const prevCloseStr = row[7]?.replace(/,/g, '')
        const prevClose = prevCloseStr === 'X0.00' || !prevCloseStr ? price : parseFloat(prevCloseStr) || price
        const change = price - prevClose
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
        
        return {
          price,
          change,
          changePercent,
          open: parseFloat(row[3]?.replace(/,/g, '')) || 0,
          high: parseFloat(row[4]?.replace(/,/g, '')) || 0,
          low: parseFloat(row[5]?.replace(/,/g, '')) || 0,
          volume: parseInt(row[2]?.replace(/,/g, '')) || 0
        }
      }
      
      return null
    } catch (error) {
      console.warn('Failed to fetch quote:', error)
      return null
    }
  }
}

export const twseClient = new TWSEClient()
export default twseClient
