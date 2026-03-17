<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

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

const stockNames: Record<string, string> = {
  '2330': '台積電',
  '6770': '力積電',
  '2317': '鴻海',
  '2454': '聯發科',
  '2881': '富邦金',
  '0050': '元大台灣50'
}

// 計算 MA 均線
function calculateMA(data: any[], period: number) {
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

// 從台灣證交所抓多個月資料
async function fetchTWSEData(stockId: string) {
  const dataList: any[] = []
  const today = new Date()
  
  // 抓最近 6 個月的資料
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = `${year}${month}`
    
    try {
      const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${date}01&stockNo=${stockId}&response=json`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.stat === 'OK' && data.data) {
        const monthData = data.data.map((item: any[]) => {
          const dateStr = item[0].replace(/\//g, '-')
          const [y, m, day] = dateStr.split('-')
          const fullDate = `${parseInt(y) + 1911}-${m}-${day}`
          
          return {
            date: fullDate,
            open: parseFloat(item[3]?.replace(/,/g, '') || '0'),
            high: parseFloat(item[4]?.replace(/,/g, '') || '0'),
            low: parseFloat(item[5]?.replace(/,/g, '') || '0'),
            close: parseFloat(item[6]?.replace(/,/g, '') || '0'),
            volume: parseFloat(item[1]?.replace(/,/g, '') || '0')
          }
        }).filter((d: any) => d.close > 0)
        
        dataList.push(...monthData)
      }
    } catch (error) {
      console.error(`Failed to fetch ${date}:`, error)
    }
  }
  
  // 按日期排序
  dataList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return dataList
}

// 抓即時報價
async function fetchQuote(stockId: string) {
  try {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${dateStr}&response=json&type=ALLBUT0999`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.tables) {
      for (const table of data.tables) {
        if (table.headers) {
          const headers = table.headers
          const rows = table.data || []
          
          const stockRow = rows.find((row: any[]) => {
            const code = row[headers.indexOf('股票代號')]
            return code === stockId
          })
          
          if (stockRow) {
            const getVal = (idx: number) => stockRow[idx] || '-'
            
            const price = getVal(headers.indexOf('收盤價'))
            const open = getVal(headers.indexOf('開盤價'))
            const high = getVal(headers.indexOf('最高價'))
            const low = getVal(headers.indexOf('最低價'))
            const volume = getVal(headers.indexOf('成交筆數'))
            
            let change = '-'
            let changePercent = '-'
            let amplitude = '-'
            
            if (price !== '-' && open !== '-') {
              const p = parseFloat(price.replace(/,/g, ''))
              const o = parseFloat(open.replace(/,/g, ''))
              change = (p - o).toFixed(2)
              changePercent = ((p - o) / o * 100).toFixed(2) + '%'
              
              if (low !== '-' && high !== '-') {
                const l = parseFloat(low.replace(/,/g, ''))
                const h = parseFloat(high.replace(/,/g, ''))
                amplitude = ((h - l) / l * 100).toFixed(2) + '%'
              }
            }
            
            stockInfo.value = {
              price,
              change: change.startsWith('-') ? change : '+' + change,
              changePercent: changePercent.startsWith('-') ? changePercent : '+' + changePercent,
              open,
              high,
              low,
              volume: volume || '-',
              amplitude
            }
            return
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch quote:', error)
  }
}

function initChart(data: any[]) {
  if (!chartRef.value || data.length === 0) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  const dates = data.map(d => d.date)
  const values = data.map(d => [d.open, d.close, d.low, d.high])
  const volumes = data.map(d => d.volume)
  
  // 計算均線
  const ma5 = calculateMA(data, 5)
  const ma10 = calculateMA(data, 10)
  const ma20 = calculateMA(data, 20)
  const ma60 = calculateMA(data, 60)
  
  const option = {
    title: {
      text: stockNames[route.params.id?.toString().replace('.TW', '') || ''] || '股票走勢',
      left: 'center',
      subtext: `${data[0]?.date || ''} ~ ${data[data.length - 1]?.date || ''}`
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      data: ['日K', 'MA5', 'MA10', 'MA20', 'MA60', '成交量'],
      top: 30
    },
    grid: [
      { left: '10%', right: '10%', top: '18%', height: '45%' },
      { left: '10%', right: '10%', top: '70%', height: '12%' }
    ],
    xAxis: [
      {
        type: 'category', data: dates, boundaryGap: false,
        axisLine: { onZero: false }, splitLine: { show: false },
        min: 'dataMin', max: 'dataMax'
      },
      {
        type: 'category', gridIndex: 1, data: dates, boundaryGap: false,
        axisLine: { onZero: false }, axisTick: { show: false },
        splitLine: { show: false }, axisLabel: { show: false },
        min: 'dataMin', max: 'dataMax'
      }
    ],
    yAxis: [
      { scale: true, splitArea: { show: true }, position: 'right' },
      { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false },
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 70, end: 100 },
      { show: true, xAxisIndex: [0, 1], type: 'slider', bottom: '2%', start: 70, end: 100 }
    ],
    series: [
      { name: 'MA5', type: 'line', data: ma5, smooth: true, lineStyle: { width: 1, color: '#e91e63' }, symbol: 'none' },
      { name: 'MA10', type: 'line', data: ma10, smooth: true, lineStyle: { width: 1, color: '#9c27b0' }, symbol: 'none' },
      { name: 'MA20', type: 'line', data: ma20, smooth: true, lineStyle: { width: 1, color: '#3f51b5' }, symbol: 'none' },
      { name: 'MA60', type: 'line', data: ma60, smooth: true, lineStyle: { width: 1, color: '#009688' }, symbol: 'none' },
      {
        name: '日K', type: 'candlestick', data: values,
        itemStyle: { color: '#ef5350', color0: '#26a69a', borderColor: '#ef5350', borderColor0: '#26a69a' }
      },
      {
        name: '成交量', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes,
        itemStyle: {
          color: function(params: any) {
            const dataIndex = params.dataIndex
            return values[dataIndex][1] > values[dataIndex][0] ? '#ef5350' : '#26a69a'
          }
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance?.resize())
}

async function loadData() {
  const symbol = (route.params.id as string) || '2330.TW'
  const stockId = symbol.replace('.TW', '')
  
  stockInfo.value = null
  
  const [data, quote] = await Promise.all([
    fetchTWSEData(stockId),
    fetchQuote(stockId)
  ])
  
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
      <h1>{{ stockNames[route.params.id?.toString().replace('.TW', '') || ''] || route.params.id?.toString().replace('.TW', '') || '股票' }}</h1>
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

    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped>
.stock-view { max-width: 100%; margin: 0 auto; padding: 1rem; }

.header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.back-btn { padding: 0.5rem 1rem; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; }
.back-btn:hover { background: #e0e0e0; }
.header h1 { font-size: 1.5rem; }

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

.chart-container {
  width: 100%;
  height: 550px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .quote-cards { grid-template-columns: repeat(3, 1fr); }
}
</style>
