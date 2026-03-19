/**
 * Mock stock data generator
 * 用於產生模擬的股價資料（解決 Yahoo Finance CORS 問題）
 */

export interface MockStockData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface FinancialData {
  eps: number          // 每股盈餘
  revenue: number      // 營收（億）
  grossMargin: number // 毛利率 (%)
  roe: number          // 股东权益回报率 (%)
  netProfit: number    // 淨利率 (%)
  debtRatio: number    // 負債比 (%)
  pe: number           // 本益比
  pb: number           // 股價淨值比
}

// 股票基本價格範圍（模擬用）- 2026年3月更新
const stockBasePrices: Record<string, { base: number; volatility: number; name: string }> = {
  '2330.TW': { base: 1900, volatility: 0.03, name: '台積電' },
  '6770.TW': { base: 50, volatility: 0.05, name: '力積電' },
  '2317.TW': { base: 190, volatility: 0.04, name: '鴻海' },
  '2454.TW': { base: 1400, volatility: 0.035, name: '聯發科' },
  '2881.TW': { base: 70, volatility: 0.025, name: '富邦金' },
  '0050.TW': { base: 200, volatility: 0.02, name: '元大台灣50' },
  '2303.TW': { base: 55, volatility: 0.04, name: '聯電' },
  '3008.TW': { base: 2000, volatility: 0.035, name: '大立光' },
  '2002.TW': { base: 30, volatility: 0.04, name: '中鋼' },
  '5880.TW': { base: 60, volatility: 0.025, name: '合庫金' },
}

// 預設價格
const defaultStockConfig = { base: 100, volatility: 0.04, name: '股票' }

/**
 * 產生模擬的股票歷史資料
 */
export function generateMockStockData(stockId: string, days: number = 120): MockStockData[] {
  const config = stockBasePrices[stockId] || defaultStockConfig
  const data: MockStockData[] = []
  
  let currentPrice = config.base * (0.9 + Math.random() * 0.2) // 初始價格
  
  const today = new Date()
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // 跳過週末
    if (date.getDay() === 0 || date.getDay() === 6) continue
    
    // 隨機漲跌
    const changePercent = (Math.random() - 0.48) * config.volatility * 2
    const open = currentPrice
    const close = currentPrice * (1 + changePercent)
    const high = Math.max(open, close) * (1 + Math.random() * config.volatility)
    const low = Math.min(open, close) * (1 - Math.random() * config.volatility)
    
    // 成交量（與漲跌幅相關）
    const baseVolume = 10000000
    const volumeMultiplier = 0.5 + Math.abs(changePercent) / config.volatility
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()))
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    })
    
    currentPrice = close
  }
  
  return data
}

/**
 * 產生模擬的財報資料
 */
export function generateMockFinancialData(stockId: string): FinancialData {
  const config = stockBasePrices[stockId] || defaultStockConfig
  const base = config.base
  
  // 根據股價範圍產生合理的財報數據
  const isTech = stockId.includes('2330') || stockId.includes('2454')
  const isFinance = stockId.includes('2881')
  
  return {
    eps: Math.round((base / 50) * (0.8 + Math.random() * 0.4) * 100) / 100,
    revenue: Math.round(base * 100 * (0.7 + Math.random() * 0.6)),
    grossMargin: isTech ? Math.round((45 + Math.random() * 20) * 10) / 10 
               : isFinance ? Math.round((30 + Math.random() * 15) * 10) / 10
               : Math.round((25 + Math.random() * 20) * 10) / 10,
    roe: Math.round((12 + Math.random() * 18) * 10) / 10,
    netProfit: Math.round((8 + Math.random() * 15) * 10) / 10,
    debtRatio: Math.round((30 + Math.random() * 30) * 10) / 10,
    pe: Math.round((15 + Math.random() * 20) * 10) / 10,
    pb: Math.round((1.5 + Math.random() * 3) * 10) / 10,
    isEstimated: true, // 標記為估計值
  }
}

/**
 * 計算均線 (MA)
 */
export function calculateMA(data: MockStockData[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close
      }
      result.push(Math.round((sum / period) * 100) / 100)
    }
  }
  
  return result
}

/**
 * 計算 RSI (Relative Strength Index)
 */
export function calculateRSI(data: MockStockData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = []
  
  if (data.length < period + 1) {
    return data.map(() => null)
  }
  
  // 計算價格變化
  const changes: number[] = []
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close)
  }
  
  // 初始平均值
  let avgGain = 0
  let avgLoss = 0
  
  // 計算第一個 RSI 值
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i]
    } else {
      avgLoss += Math.abs(changes[i])
    }
  }
  avgGain /= period
  avgLoss /= period
  
  // 第一個 RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(null) // 對應 data[0]
  for (let i = 0; i < period - 1; i++) {
    result.push(null)
  }
  result.push(100 - (100 / (1 + rs)))
  
  // 後續 RSI 值使用平滑移動平均
  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))
    result.push(Math.round(rsi * 100) / 100)
  }
  
  return result
}

/**
 * 計算 MACD
 */
export function calculateMACD(
  data: MockStockData[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const macd: (number | null)[] = []
  const signal: (number | null)[] = []
  const histogram: (number | null)[] = []
  
  // 計算 EMA
  function calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)
    
    // 初始 SMA
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += values[i]
    }
    ema.push(sum / period)
    
    // 後續 EMA
    for (let i = period; i < values.length; i++) {
      ema.push((values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1])
    }
    
    return ema
  }
  
  const closes = data.map(d => d.close)
  
  // 計算 Fast 和 Slow EMA
  const fastEMA = calculateEMA(closes, fastPeriod)
  const slowEMA = calculateEMA(closes, slowPeriod)
  
  // 計算 MACD 線
  for (let i = 0; i < closes.length; i++) {
    if (i < slowPeriod - 1) {
      macd.push(null)
    } else {
      const fastIndex = i - (slowPeriod - fastPeriod)
      const value = fastEMA[fastIndex] - slowEMA[i - slowPeriod + 1]
      macd.push(Math.round(value * 100) / 100)
    }
  }
  
  // 計算 Signal 線 (EMA of MACD)
  const macdValues = macd.filter((v): v is number => v !== null)
  if (macdValues.length >= signalPeriod) {
    const signalEMA = calculateEMA(macdValues, signalPeriod)
    
    for (let i = 0; i < macd.length; i++) {
      if (macd[i] === null) {
        signal.push(null)
        histogram.push(null)
      } else if (i >= macd.length - macdValues.length) {
        const signalIndex = i - (macd.length - macdValues.length)
        signal.push(Math.round(signalEMA[signalIndex] * 100) / 100)
        histogram.push(Math.round((macd[i]! - signalEMA[signalIndex]) * 100) / 100)
      }
    }
  }
  
  return { macd, signal, histogram }
}

/**
 * 格式化數字（千分位）
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 格式化成交量
 */
export function formatVolume(volume: number): string {
  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + '億'
  } else if (volume >= 10000) {
    return (volume / 10000).toFixed(0) + '萬'
  }
  return volume.toString()
}
