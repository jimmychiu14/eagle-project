/**
 * useChart Composable
 * 封裝 Lightweight Charts 的初始化、數據更新、resize 處理
 */

import { ref, type Ref } from 'vue'
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData } from 'lightweight-charts'
import type { ChartConfig } from '@/types/stock'

export interface UseChartReturn {
  chartContainer: Ref<HTMLElement | null>
  chart: IChartApi | null
  candlestickSeries: ISeriesApi<'Candlestick'> | null
  initChart: (container: HTMLElement, config?: ChartConfig) => void
  setData: (data: CandlestickData[]) => void
  updateData: (data: CandlestickData) => void
  resizeChart: (width: number, height: number) => void
  destroyChart: () => void
  applyChartOptions: (options: Record<string, unknown>) => void
  applySeriesOptions: (options: Record<string, unknown>) => void
}

export function useChart(): UseChartReturn {
  const chartContainer = ref<HTMLElement | null>(null)
  let chart: IChartApi | null = null
  let candlestickSeries: ISeriesApi<'Candlestick'> | null = null

  /**
   * 初始化 Chart
   */
  const initChart = (container: HTMLElement, config?: ChartConfig): void => {
    // 清理舊 chart
    if (chart) {
      chart.remove()
      chart = null
      candlestickSeries = null
    }

    const { width = 800, height = 400, theme = 'light' } = config || {}

    // 根據主題調整顏色
    const isDark = theme === 'dark'
    const bgColor = isDark ? '#1a1a1a' : '#ffffff'
    const textColor = isDark ? '#d1d4dc' : '#333333'
    const gridColor = isDark ? '#2b2b43' : '#e0e0e0'
    const borderColor = isDark ? '#2b2b43' : '#e0e0e0'

    // 建立 chart 選項 (使用 any 避免 lightcharts v4 類型問題)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartOptions: any = {
      width,
      height,
      layout: {
        background: { color: bgColor },
        textColor,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor, style: 1, visible: true },
        horzLines: { color: gridColor, style: 1, visible: true },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#787b86', width: 1, style: 2, visible: true, labelVisible: true, labelBackgroundColor: '#787b86' },
        horzLine: { color: '#787b86', width: 1, style: 2, visible: true, labelVisible: true, labelBackgroundColor: '#787b86' },
      },
      rightPriceScale: {
        borderColor,
        visible: true,
        autoScale: true,
      },
      timeScale: {
        borderColor,
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 0,
        barSpacing: 8,
      },
    }

    // 建立 chart
    chart = createChart(container, chartOptions)

    // 加入 K 線 series
    candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
  }

  /**
   * 設定 K 線數據
   */
  const setData = (data: CandlestickData[]): void => {
    if (candlestickSeries) {
      candlestickSeries.setData(data)
    }
  }

  /**
   * 更新單筆 K 線數據（用於即時報價）
   */
  const updateData = (data: CandlestickData): void => {
    if (candlestickSeries) {
      candlestickSeries.update(data)
    }
  }

  /**
   * Resize Chart
   */
  const resizeChart = (width: number, height: number): void => {
    if (chart) {
      chart.resize(width, height)
    }
  }

  /**
   * 銷毀 Chart
   */
  const destroyChart = (): void => {
    if (chart) {
      chart.remove()
      chart = null
      candlestickSeries = null
    }
  }

  /**
   * 套用 Chart 選項
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyChartOptions = (options: any): void => {
    if (chart) {
      chart.applyOptions(options)
    }
  }

  /**
   * 套用 K 線 Series 選項
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySeriesOptions = (options: any): void => {
    if (candlestickSeries) {
      candlestickSeries.applyOptions(options)
    }
  }

  return {
    chartContainer,
    chart,
    candlestickSeries,
    initChart,
    setData,
    updateData,
    resizeChart,
    destroyChart,
    applyChartOptions,
    applySeriesOptions,
  }
}
