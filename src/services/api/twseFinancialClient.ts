/**
 * TWSE 證交所財報 API Client
 * 台灣證券交易所公開資訊觀測站 - https://www.twse.com.tw/
 * 
 * API 端點：
 * - 資產負債表: /opendata/t187ap07_L_ci?stockNo={股票代碼}
 * - 損益表: /opendata/t187ap06_L_ci?stockNo={股票代碼}
 */

import type { FinancialData } from '@/types/stock'

// TWSE API Base URL
// 使用 Railway proxy 來繞過 CORS（第三方服務）
const CORS_PROXY = 'https://twse-proxy-production.up.railway.app'
const TWSE_API_BASE = import.meta.env.PROD 
  ? CORS_PROXY 
  : '/twse'

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

// TWSE API 回傳的資產負債表欄位
interface TWSEBalanceSheet {
  流動資產: string
  非流動資產: string
  資產總額: string
  流動負債: string
  非流動負債: string
  負債總額: string
  股本: string
  資本公積: string
  保留盈餘: string
  權益總額: string
  每股參考淨值: string
  報告日期: string
  季度: string
  [key: string]: string // 允許動態存取欄位
}

// TWSE API 回傳的損益表欄位
interface TWSEIncomeStatement {
  營業收入: string
  營業成本: string
  '營業毛利（毛損）': string
  '營業毛利（毛損）淨額': string
  營業費用: string
  營業利益: string
  稅前淨利: string
  '本期淨利（淨損）': string
  '基本每股盈餘（元）': string
  報告日期: string
  季度: string
  [key: string]: string // 允許動態存取欄位
}

class TWSEFinancialClient {
  /**
   * 取得資產負債表
   */
  async getBalanceSheet(stockId: string): Promise<TWSEBalanceSheet | null> {
    try {
      const url = `${TWSE_API_BASE}/opendata/t187ap07_L_ci?stockNo=${stockId}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`TWSE Balance Sheet API error: ${response.status}`)
        return null
      }
      
      const data = await response.json()
      
      if (!data || data.length === 0) {
        console.warn('TWSE Balance Sheet: No data returned')
        return null
      }
      
      // API 回傳所有公司資料，需要過濾出指定的股票代碼
      const stockData = data.find((item: any) => item.公司代號 === stockId)
      
      if (!stockData) {
        console.warn(`TWSE Balance Sheet: No data for stock ${stockId}`)
        return null
      }
      
      return stockData as TWSEBalanceSheet
    } catch (error) {
      console.error('TWSE Balance Sheet fetch error:', error)
      return null
    }
  }

  /**
   * 取得損益表
   */
  async getIncomeStatement(stockId: string): Promise<TWSEIncomeStatement | null> {
    try {
      const url = `${TWSE_API_BASE}/opendata/t187ap06_L_ci?stockNo=${stockId}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`TWSE Income Statement API error: ${response.status}`)
        return null
      }
      
      const data = await response.json()
      
      if (!data || data.length === 0) {
        console.warn('TWSE Income Statement: No data returned')
        return null
      }
      
      // API 回傳所有公司資料，需要過濾出指定的股票代碼
      const stockData = data.find((item: any) => item.公司代號 === stockId)
      
      if (!stockData) {
        console.warn(`TWSE Income Statement: No data for stock ${stockId}`)
        return null
      }
      
      return stockData as TWSEIncomeStatement
    } catch (error) {
      console.error('TWSE Income Statement fetch error:', error)
      return null
    }
  }

  /**
   * 取得完整財報資料並轉換為系統格式
   * @param stockId 股票代碼
   * @param currentPrice 現價（用於計算 PE、PB）
   */
  async getFinancialData(stockId: string, currentPrice?: number): Promise<FinancialData | null> {
    try {
      // 同時取得資產負債表和損益表
      const [balanceSheet, incomeStatement] = await Promise.all([
        this.getBalanceSheet(stockId),
        this.getIncomeStatement(stockId)
      ])

      if (!balanceSheet || !incomeStatement) {
        console.warn('TWSE: Missing financial data')
        return null
      }

      // 解析數值（移除逗號並轉為數字）
      const parseNumber = (value: string | number): number => {
        if (typeof value === 'number') return value
        const cleaned = value?.replace(/,/g, '')?.replace(/[^0-9.\-+]/g, '') || '0'
        return parseFloat(cleaned) || 0
      }

      // 從損益表取得資料
      const revenue = parseNumber(incomeStatement.營業收入) / 100000000 // 轉換為億 (API 回傳單位為元)
      const grossProfit = parseNumber(incomeStatement['營業毛利（毛損）淨額'] || incomeStatement['營業毛利（毛損）'])
      const netProfit = parseNumber(incomeStatement['本期淨利（淨損）'] || incomeStatement.本期淨利)
      const eps = parseNumber(incomeStatement['基本每股盈餘（元）'] || incomeStatement['基本每股盈餘'])

      // 計算毛利率
      const grossMargin = revenue > 0 ? (grossProfit / 100000000 / revenue) * 100 : 0 // 需要將毛利也轉換為億

      // 計算淨利率
      const netProfitMargin = revenue > 0 ? (netProfit / 100000000 / revenue) * 100 : 0 // 需要將淨利也轉換為億

      // 從資產負債表取得資料
      const totalAssets = parseNumber(balanceSheet.資產總額) / 100000000 // 轉換為億
      const totalEquity = parseNumber(balanceSheet.權益總額) / 100000000 // 轉換為億
      const totalDebt = parseNumber(balanceSheet.負債總額) / 100000000 // 轉換為億
      const bookValuePerShare = parseNumber(balanceSheet.每股參考淨值)

      // 計算 ROE (使用億為單位)
      const roe = totalEquity > 0 ? (netProfit / 100000000 / totalEquity) * 100 : 0

      // 計算負債比
      const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0

      // 計算 PE 和 PB
      const pe = eps > 0 && currentPrice ? currentPrice / eps : 0
      const pb = bookValuePerShare > 0 && currentPrice ? currentPrice / bookValuePerShare : 0

      const financialData: FinancialData = {
        eps: eps,
        revenue: revenue,
        grossMargin: grossMargin,
        netProfit: netProfitMargin,
        roe: roe,
        debtRatio: debtRatio,
        pe: pe,
        pb: pb
      }

      console.log('TWSE Financial Data:', {
        stockId,
        reportDate: incomeStatement.報告日期,
        quarter: incomeStatement.季度,
        eps,
        revenue,
        grossMargin,
        netProfit: netProfitMargin,
        roe,
        debtRatio,
        pe,
        pb
      })

      return financialData
    } catch (error) {
      console.error('TWSE getFinancialData error:', error)
      return null
    }
  }

  /**
   * 取得股票名稱
   */
  getStockName(stockId: string): string {
    const normalized = stockId.replace('.TW', '')
    return STOCK_NAMES[normalized] || normalized
  }

  /**
   * 測試 API 連線
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${TWSE_API_BASE}/opendata/t187ap06_L_ci?stockNo=2330`
      const response = await fetch(url)
      return response.ok
    } catch {
      return false
    }
  }
}

// 匯出單例
export const twseFinancialClient = new TWSEFinancialClient()
export default twseFinancialClient
