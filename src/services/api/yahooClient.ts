import axios from 'axios'

interface YahooQuote {
  symbol: string
  shortName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketOpen: number
  regularMarketPreviousClose: number
}

interface YahooHistoricalData {
  date: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

class YahooFinanceClient {
  private baseUrl = '/yahoo'
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  }

  private async getQuote(symbol: string): Promise<YahooQuote> {
    const url = `${this.baseUrl}/${symbol}?interval=1d&range=1d`
    const response = await axios.get(url, {
      headers: this.headers
    })
    
    const result = response.data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators.quote[0]
    
    return {
      symbol: meta.symbol,
      shortName: meta.shortName || meta.symbol,
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketChange: meta.regularMarketChange,
      regularMarketChangePercent: meta.regularMarketChangePercent,
      regularMarketVolume: meta.regularMarketVolume,
      regularMarketDayHigh: meta.regularMarketDayHigh,
      regularMarketDayLow: meta.regularMarketDayLow,
      regularMarketOpen: meta.regularMarketOpen,
      regularMarketPreviousClose: meta.chartPreviousClose || meta.previousClose
    }
  }

  async getStockDaily(symbol: string, range: string = '3mo'): Promise<YahooHistoricalData[]> {
    const url = `${this.baseUrl}/${symbol}?interval=1d&range=${range}`
    const response = await axios.get(url, {
      headers: this.headers
    })
    
    const result = response.data.chart.result[0]
    const timestamps = result.timestamp as number[]
    const quote = result.indicators.quote[0]
    
    return timestamps.map((ts, i) => ({
      date: ts,
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i]
    })).filter(d => d.close !== null)
  }

  async getQuoteInfo(symbol: string) {
    return this.getQuote(symbol)
  }
}

export const yahooFinance = new YahooFinanceClient()
export default yahooFinance
