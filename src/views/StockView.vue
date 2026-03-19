<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { useStockStore } from '@/stores/stockStore'
import { 
  generateMockStockData, 
  calculateMA, 
  calculateRSI, 
  calculateMACD,
  formatVolume
} from '@/utils/mockData'

const route = useRoute()
const router = useRouter()
const watchlistStore = useWatchlistStore()
const stockStore = useStockStore()

const chartRef = ref<HTMLElement | null>(null)
const chartInstance = ref<echarts.ECharts | null>(null)

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

// 股票基本資料
const stockInfo = ref<{
  price: string
  change: string
  changePercent: string
  open: string
  high: string
  low: string
  volume: string
  amplitude: string
} | null>(null)

// 財報資料（使用 stockStore 中的真實財報資料）
const financialData = computed(() => stockStore.financialData)

// 技術指標
const technicalIndicators = ref<{
  rsi: number | null
  macd: { macd: number | null; signal: number | null; histogram: number | null }
}>({
  rsi: null,
  macd: { macd: null, signal: null, histogram: null }
})

// 股票代碼
const stockId = computed(() => {
  const id = route.params.id as string
  return id?.replace('.TW', '') || '2330'
})

const stockName = computed(() => {
  return stockNames[stockId.value] || route.params.id?.toString().replace('.TW', '') || '股票'
})

// 檢查是否在觀察名單
const isWatched = computed(() => {
  return watchlistStore.isInWatchlist(route.params.id as string)
})

// 設定價格提醒
const alertThreshold = computed(() => {
  const item = watchlistStore.watchlist.find(w => w.id === route.params.id)
  return item?.alertThreshold
})

// 切換觀察名單
function toggleWatchlist() {
  const id = route.params.id as string
  if (watchlistStore.isInWatchlist(id)) {
    watchlistStore.removeFromWatchlist(id)
  } else {
    watchlistStore.addToWatchlist(id, stockName.value)
  }
}

// 設定價格提醒
function setAlert() {
  const id = route.params.id as string
  const current = alertThreshold.value
  const threshold = prompt('請輸入價格漲跌幅門檻（%）:', current?.toString() || '5')
  if (threshold) {
    const value = parseFloat(threshold)
    if (!isNaN(value) && value > 0) {
      if (!watchlistStore.isInWatchlist(id)) {
        watchlistStore.addToWatchlist(id, stockName.value)
      }
      watchlistStore.setAlertThreshold(id, value)
      alert(`已設定 ${stockName.value} 的價格提醒為 ±${value}%`)
    }
  }
}

// 初始化 K 線圖（包含均線、成交量、RSI、MACD）
function initChart(data: any[]) {
  if (!chartRef.value || data.length === 0) return
  
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
  
  chartInstance.value = echarts.init(chartRef.value)
  
  const dates = data.map(d => d.date)
  const values = data.map(d => [d.open, d.close, d.low, d.high])
  const volumes = data.map(d => d.volume)
  
  // 計算均線
  const ma5 = calculateMA(data, 5)
  const ma20 = calculateMA(data, 20)
  const ma60 = calculateMA(data, 60)
  
  // 計算 RSI
  const rsi = calculateRSI(data, 14)
  technicalIndicators.value.rsi = rsi[rsi.length - 1]
  
  // 計算 MACD
  const macdData = calculateMACD(data, 12, 26, 9)
  technicalIndicators.value.macd = {
    macd: macdData.macd[macdData.macd.length - 1],
    signal: macdData.signal[macdData.signal.length - 1],
    histogram: macdData.histogram[macdData.histogram.length - 1]
  }
  
  // 處理 RSI 數據（只取最近 60 天）
  const rsiData = rsi.slice(-60)
  const rsiDates = dates.slice(-60)
  
  // 處理 MACD 數據（只取最近 60 天）
  const macdLine = macdData.macd.slice(-60)
  const signalLine = macdData.signal.slice(-60)
  const histogram = macdData.histogram.slice(-60)
  
  const option = {
    title: {
      text: stockName.value,
      left: 'center',
      subtext: `${data[0]?.date || ''} ~ ${data[data.length - 1]?.date || ''}`
    },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'cross' },
      formatter: function(params: any[]) {
        let result = `<b>${params[0].axisValue}</b><br/>`
        params.forEach(p => {
          if (p.value !== null && p.value !== undefined) {
            if (Array.isArray(p.value)) {
              result += `${p.seriesName}: ${p.value[1]}<br/>`
            } else {
              result += `${p.seriesName}: ${p.value}<br/>`
            }
          }
        })
        return result
      }
    },
    legend: {
      data: ['日K', 'MA5', 'MA20', 'MA60', '成交量', 'RSI', 'MACD'],
      top: 30
    },
    grid: [
      { left: '10%', right: '10%', top: '15%', height: '35%' },      // K 線圖
      { left: '10%', right: '10%', top: '53%', height: '10%' },     // 成交量
      { left: '10%', right: '10%', top: '66%', height: '10%' },    // RSI
      { left: '10%', right: '10%', top: '79%', height: '12%' }      // MACD
    ],
    xAxis: [
      { type: 'category', data: dates, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, min: 'dataMin', max: 'dataMax' },
      { type: 'category', gridIndex: 1, data: dates, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' },
      { type: 'category', gridIndex: 2, data: rsiDates, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' },
      { type: 'category', gridIndex: 3, data: rsiDates, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
    ],
    yAxis: [
      { scale: true, splitArea: { show: true }, position: 'right' },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } },
      { scale: true, gridIndex: 2, min: 0, max: 100, splitNumber: 2, axisLabel: { show: true, formatter: '{value}' }, splitLine: { show: true } },
      { scale: true, gridIndex: 3, axisLabel: { show: true }, splitLine: { show: true } }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1, 2, 3], start: 60, end: 100 },
      { show: true, xAxisIndex: [0, 1, 2, 3], type: 'slider', bottom: '2%', start: 60, end: 100 }
    ],
    series: [
      // K 線圖和均線
      { name: 'MA5', type: 'line', data: ma5, smooth: true, lineStyle: { width: 1, color: '#e91e63' }, symbol: 'none' },
      { name: 'MA20', type: 'line', data: ma20, smooth: true, lineStyle: { width: 1, color: '#3f51b5' }, symbol: 'none' },
      { name: 'MA60', type: 'line', data: ma60, smooth: true, lineStyle: { width: 1, color: '#009688' }, symbol: 'none' },
      { name: '日K', type: 'candlestick', data: values, xAxisIndex: 0, yAxisIndex: 0,
        itemStyle: { color: '#ef5350', color0: '#26a69a', borderColor: '#ef5350', borderColor0: '#26a69a' } },
      // 成交量
      { name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes,
        itemStyle: { color: function(params: any) { return values[params.dataIndex]?.[1] > values[params.dataIndex]?.[0] ? '#ef5350' : '#26a69a' } } },
      // RSI
      { name: 'RSI', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: rsiData, smooth: true, lineStyle: { width: 2, color: '#ff9800' }, symbol: 'none',
        markLine: { data: [{ yAxis: 30, label: { formatter: '超賣' } }, { yAxis: 70, label: { formatter: '超買' } }], lineStyle: { type: 'dashed', color: '#999' } } },
      // MACD
      { name: 'MACD', type: 'line', xAxisIndex: 3, yAxisIndex: 3, data: macdLine, smooth: true, lineStyle: { width: 1.5, color: '#2196f3' }, symbol: 'none' },
      { name: 'Signal', type: 'line', xAxisIndex: 3, yAxisIndex: 3, data: signalLine, smooth: true, lineStyle: { width: 1.5, color: '#ff9800' }, symbol: 'none' },
      { name: 'Histogram', type: 'bar', xAxisIndex: 3, yAxisIndex: 3, data: histogram,
        itemStyle: { color: function(params: any) { return params.value >= 0 ? '#ef5350' : '#26a69a' } } }
    ]
  }
  
  chartInstance.value.setOption(option)
  window.addEventListener('resize', () => chartInstance.value?.resize())
}

// 載入資料（使用 TWSE API）
async function loadData() {
  const symbol = (route.params.id as string) || '2330.TW'
  const normalizedId = symbol.replace('.TW', '')
  
  stockInfo.value = null
  
  try {
    // 從 stockStore (FinMind) 取得資料
    await stockStore.fetchStockData(normalizedId, '6mo')
    const data = stockStore.stockData
    
    // 使用真實資料
    if (data && data.length > 0) {
      const latest = data[data.length - 1]
      const yesterday = data.length > 1 ? data[data.length - 2] : latest
      
      const change = latest.close - yesterday.close
      const changePercent = (change / yesterday.close) * 100
      const amplitude = ((latest.high - latest.low) / latest.low * 100)
      
      stockInfo.value = {
        price: latest.close.toFixed(2),
        change: (change >= 0 ? '+' : '') + change.toFixed(2),
        changePercent: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%',
        open: latest.open.toFixed(2),
        high: latest.high.toFixed(2),
        low: latest.low.toFixed(2),
        volume: formatVolume(latest.volume),
        amplitude: amplitude.toFixed(2) + '%'
      }
      
      // 更新觀察名單價格
      watchlistStore.updateStockPrice(symbol, latest.close, change, changePercent)
      
      // 檢查價格提醒
      const watchlistItem = watchlistStore.watchlist.find(item => item.id === symbol)
      if (watchlistItem && watchlistItem.alertThreshold && Math.abs(changePercent) >= watchlistItem.alertThreshold) {
        const direction = changePercent > 0 ? '漲' : '跌'
        setTimeout(() => {
          alert(`🚨 價格提醒：${watchlistItem.name} (${watchlistItem.id})\n${direction}幅已達 ${Math.abs(changePercent).toFixed(2)}%\n(設定門檻: ±${watchlistItem.alertThreshold}%)`)
        }, 500)
      }
      
      initChart(data)
    } else {
      // API 無回應，使用 mock data
      console.warn('FinMind API returned no data, using mock data')
      loadMockData(symbol)
    }
  } catch (error) {
    console.error('Failed to load stock data:', error)
    // API 錯誤，使用 mock data
    loadMockData(symbol)
  }
}

// 載入模擬資料（當 API 失敗時）
function loadMockData(symbol: string) {
  const data = generateMockStockData(symbol, 120)
  
  if (data.length > 0) {
    const latest = data[data.length - 1]
    const yesterday = data.length > 1 ? data[data.length - 2] : latest
    
    const change = latest.close - yesterday.close
    const changePercent = (change / yesterday.close) * 100
    const amplitude = ((latest.high - latest.low) / latest.low * 100)
    
    stockInfo.value = {
      price: latest.close.toFixed(2),
      change: (change >= 0 ? '+' : '') + change.toFixed(2),
      changePercent: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%',
      open: latest.open.toFixed(2),
      high: latest.high.toFixed(2),
      low: latest.low.toFixed(2),
      volume: formatVolume(latest.volume),
      amplitude: amplitude.toFixed(2) + '%'
    }
    
    // 更新觀察名單價格
    watchlistStore.updateStockPrice(symbol, latest.close, change, changePercent)
    
    // 檢查價格提醒
    const triggered = watchlistStore.checkPriceAlert(symbol)
    if (triggered) {
      const direction = triggered.changePercent! > 0 ? '漲' : '跌'
      setTimeout(() => {
        alert(`🚨 價格提醒：${triggered.name} (${triggered.id})\n${direction}幅已達 ${Math.abs(triggered.changePercent!).toFixed(2)}%\n(設定門檻: ±${triggered.alertThreshold}%)`)
      }, 500)
    }
  }
  
  initChart(data)
}

onMounted(() => {
  loadData()
})

watch(() => route.params.id, () => {
  loadData()
})
</script>

<template>
  <div class="stock-view">
    <header class="header">
      <button class="back-btn" @click="router.push('/')">← 返回</button>
      <h1>{{ stockName }}</h1>
      <div class="header-actions">
        <button 
          class="watchlist-btn" 
          :class="{ active: isWatched }"
          @click="toggleWatchlist"
        >
          {{ isWatched ? '❤️' : '🤍' }} {{ isWatched ? '已收藏' : '收藏' }}
        </button>
        <button 
          class="alert-btn" 
          :class="{ active: alertThreshold }"
          @click="setAlert"
        >
          {{ alertThreshold ? `🔔 ${alertThreshold}%` : '🔕 提醒' }}
        </button>
      </div>
    </header>

    <!-- 股票報價區 -->
    <div v-if="stockInfo" class="quote-cards">
      <div class="quote-card main-price">
        <div class="label">收盤價</div>
        <div class="value">{{ stockInfo.price }}</div>
        <div class="change" :class="{ up: stockInfo.change.startsWith('+'), down: stockInfo.change.startsWith('-') }">
          {{ stockInfo.change }} ({{ stockInfo.changePercent }})
        </div>
      </div>
      <div class="quote-card">
        <div class="label">開盤</div>
        <div class="value">{{ stockInfo.open }}</div>
      </div>
      <div class="quote-card">
        <div class="label">最高</div>
        <div class="value">{{ stockInfo.high }}</div>
      </div>
      <div class="quote-card">
        <div class="label">最低</div>
        <div class="value">{{ stockInfo.low }}</div>
      </div>
      <div class="quote-card">
        <div class="label">漲跌幅</div>
        <div class="value">{{ stockInfo.amplitude }}</div>
      </div>
      <div class="quote-card">
        <div class="label">成交量</div>
        <div class="value">{{ stockInfo.volume }}</div>
      </div>
    </div>

    <!-- 技術指標 -->
    <div v-if="technicalIndicators.rsi" class="tech-indicators">
      <div class="indicator-card">
        <span class="label">RSI(14)</span>
        <span class="value" :class="{ overbought: technicalIndicators.rsi > 70, oversold: technicalIndicators.rsi < 30 }">
          {{ technicalIndicators.rsi.toFixed(2) }}
        </span>
        <span class="hint">
          {{ technicalIndicators.rsi > 70 ? '超買' : technicalIndicators.rsi < 30 ? '超賣' : '正常' }}
        </span>
      </div>
      <div class="indicator-card">
        <span class="label">MACD</span>
        <span class="value" :class="{ positive: (technicalIndicators.macd.histogram ?? 0) > 0, negative: (technicalIndicators.macd.histogram ?? 0) < 0 }">
          {{ technicalIndicators.macd.macd?.toFixed(2) || '-' }}
        </span>
        <span class="hint">
          Signal: {{ technicalIndicators.macd.signal?.toFixed(2) || '-' }}
        </span>
      </div>
    </div>

    <!-- 財報資料 -->
    <div v-if="financialData" class="financial-data">
      <h3>📊 財報數據 <span v-if="financialData.isEstimated" class="estimated-badge">估計值</span></h3>
      <div class="financial-grid">
        <div class="fin-item">
          <span class="label">EPS</span>
          <span class="value">{{ financialData.eps.toFixed(2) }}</span>
        </div>
        <div class="fin-item">
          <span class="label">營收(億)</span>
          <span class="value">{{ financialData.revenue.toFixed(1) }}</span>
        </div>
        <div class="fin-item">
          <span class="label">毛利率</span>
          <span class="value">{{ financialData.grossMargin.toFixed(1) }}%</span>
        </div>
        <div class="fin-item">
          <span class="label">淨利率</span>
          <span class="value">{{ financialData.netProfit.toFixed(1) }}%</span>
        </div>
        <div class="fin-item">
          <span class="label">ROE</span>
          <span class="value">{{ financialData.roe.toFixed(1) }}%</span>
        </div>
        <div class="fin-item">
          <span class="label">負債比</span>
          <span class="value">{{ financialData.debtRatio.toFixed(1) }}%</span>
        </div>
        <div class="fin-item">
          <span class="label">本益比</span>
          <span class="value">{{ financialData.pe.toFixed(1) }}</span>
        </div>
        <div class="fin-item">
          <span class="label">淨值比</span>
          <span class="value">{{ financialData.pb.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped>
.stock-view { max-width: 100%; margin: 0 auto; padding: 1rem; }

.header { 
  display: flex; 
  align-items: center; 
  gap: 1rem; 
  margin-bottom: 1rem; 
  flex-wrap: wrap;
}

.back-btn { padding: 0.5rem 1rem; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; }
.back-btn:hover { background: #e0e0e0; }

.header h1 { font-size: 1.5rem; flex: 1; }

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.watchlist-btn, .alert-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.watchlist-btn.active {
  background: #fff0f5;
  border-color: #e91e63;
}

.alert-btn.active {
  background: #fff8e1;
  border-color: #ffc107;
}

.quote-cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.quote-card {
  background: white;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.quote-card.main-price {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.quote-card .label { font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
.quote-card.main-price .label { color: rgba(255,255,255,0.8); }
.quote-card .value { font-size: 1.1rem; font-weight: bold; }
.quote-card .change { font-size: 0.8rem; margin-top: 0.25rem; }
.quote-card .change.up { color: #ef5350; }
.quote-card .change.down { color: #26a69a; }
.quote-card.main-price .change { color: white; }

/* 技術指標 */
.tech-indicators {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.indicator-card {
  flex: 1;
  background: white;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.indicator-card .label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 0.25rem;
}

.indicator-card .value {
  display: block;
  font-size: 1.25rem;
  font-weight: bold;
  color: #2c3e50;
}

.indicator-card .value.overbought { color: #ef5350; }
.indicator-card .value.oversold { color: #26a69a; }
.indicator-card .value.positive { color: #ef5350; }
.indicator-card .value.negative { color: #26a69a; }

.indicator-card .hint {
  display: block;
  font-size: 0.7rem;
  color: #999;
  margin-top: 0.25rem;
}

/* 財報資料 */
.financial-data {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.financial-data h3 {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.estimated-badge {
  font-size: 0.7rem;
  background: #ffc107;
  color: #333;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: normal;
}

.financial-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.fin-item {
  text-align: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.fin-item .label {
  display: block;
  font-size: 0.7rem;
  color: #888;
  margin-bottom: 0.25rem;
}

.fin-item .value {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #2c3e50;
}

.chart-container {
  width: 100%;
  height: 650px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .quote-cards { grid-template-columns: repeat(3, 1fr); }
  .financial-grid { grid-template-columns: repeat(2, 1fr); }
  .header-actions { width: 100%; justify-content: flex-end; }
}
</style>
