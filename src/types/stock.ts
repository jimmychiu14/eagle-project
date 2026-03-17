/**
 * Stock-related TypeScript type definitions
 * For Phoenix Project K-line Chart
 */

import type { Time, IChartApi } from 'lightweight-charts'

// Re-export IChartApi for external use
export type { IChartApi }

// Stock Daily Data from FinMind API
export interface StockDailyData {
  date: string
  stock_id: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change?: number
  change_percent?: number
}

// FinMind API Response wrapper
export interface FinMindResponse<T> {
  success: boolean
  data: T[]
  msg?: string
}

// Cache options
export interface CacheOptions {
  ttl?: number // milliseconds
  useLocalStorage?: boolean
}

// OHLC Data - Open, High, Low, Close
export interface OHLC {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

// Candlestick data (same as OHLC for candlestick charts)
export type CandlestickData = OHLC

// Extended candlestick data with custom fields
export interface CandlestickDataExtended extends CandlestickData {
  volume?: number
  turnover?: number
}

// Time period types
export type TimePeriod = '1m' | '5m' | '15m' | '1h' | '1d' | '1w'

// Stock basic information
export interface StockInfo {
  symbol: string          // 股票代碼 e.g. '2330'
  name: string            // 股票名稱 e.g. '台積電'
  exchange?: string       // 交易所 e.g. 'TWSE'
  currency?: string       // 幣別 e.g. 'TWD'
  type?: string           // 股票類型 e.g. 'stock', 'etf'
  market?: string         // 市場 e.g. '上市', '上櫃'
}

// Stock price quote (realtime)
export interface StockQuote {
  symbol: string
  price: number           // current price
  change: number          // price change
  changePercent: number  // percentage change
  volume: number          // trading volume
  open: number           // today's open
  high: number           // today's high
  low: number            // today's low
  close: number          // yesterday's close
  timestamp: number      // unix timestamp
}

// Chart options configuration
export interface ChartConfig {
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  gridVisible?: boolean
  crosshairVisible?: boolean
  timeScaleVisible?: boolean
  priceScaleVisible?: boolean
}

// Series options for candlestick
export interface CandlestickSeriesOptions {
  upColor: string
  downColor: string
  borderUpColor: string
  borderDownColor: string
  wickUpColor: string
  wickDownColor: string
}

// Chart instance type (from lightweight-charts)
export interface ChartInstance {
  remove: () => void
  resize: (width: number, height: number, forceRepaint?: boolean) => void
  addCandlestickSeries: (options?: Partial<CandlestickSeriesOptions>) => {
    setData: (data: CandlestickData[]) => void
    update: (data: CandlestickData) => void
    options: () => CandlestickSeriesOptions
    applyOptions: (options: Partial<CandlestickSeriesOptions>) => void
  }
  timeScale: () => {
    applyOptions: (options: object) => void
    options: () => object
    subscribeVisibleTimeRangeChange: (callback: (range: object | null) => void) => void
    unsubscribeVisibleTimeRangeChange: (callback: (range: object | null) => void) => void
    setVisibleRange: (range: { from: Time; to: Time }) => void
  }
  priceScale: () => {
    applyOptions: (options: object) => void
    options: () => object
  }
  applyOptions: (options: object) => void
  options: () => object
}

// Marker types for chart annotations
export interface ChartMarker {
  time: Time
  position: 'aboveBar' | 'belowBar'
  color: string
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square' | 'flag'
  text: string
}

// API Response types
export interface StockHistoryResponse {
  symbol: string
  data: CandlestickData[]
  period: TimePeriod
}

export interface StockListResponse {
  stocks: StockInfo[]
  total: number
}
