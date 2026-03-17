<template>
  <div class="stock-chart">
    <!-- Chart Container -->
    <div 
      ref="chartRef" 
      class="chart-container"
      :style="{ width: width + 'px', height: height + 'px' }"
    />
    
    <!-- Loading State -->
    <div v-if="loading" class="chart-loading">
      <span>載入中...</span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="chart-error">
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChart } from '@/composables/useChart'
import type { CandlestickData, ChartConfig } from '@/types/stock'

// Props
interface Props {
  data?: CandlestickData[]
  width?: number
  height?: number
  config?: ChartConfig
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  width: 800,
  height: 400,
  config: () => ({}),
  loading: false,
  error: null,
})

// Emits
const emit = defineEmits<{
  (e: 'chart-ready'): void
  (e: 'chart-click', event: MouseEvent): void
  (e: 'chart-crosshair-move', param: object): void
}>()

// Chart composable
const { 
  initChart, 
  setData, 
  updateData, 
  resizeChart, 
  destroyChart,
  applyChartOptions,
  chart: chartInstance,
} = useChart()

// Chart container ref
const chartRef = ref<HTMLElement | null>(null)

// 初始化 Chart
const initChartInstance = () => {
  if (!chartRef.value) return

  const mergedConfig: ChartConfig = {
    width: props.width,
    height: props.height,
    ...props.config,
  }

  initChart(chartRef.value, mergedConfig)

  // 如果有初始數據，設定數據
  if (props.data.length > 0) {
    setData(props.data)
  }

  // 發送 chart ready 事件
  emit('chart-ready')

  // 監聽 click 事件
  if (chartInstance) {
    chartInstance.subscribeClick((param: unknown) => {
      emit('chart-click', param as MouseEvent)
    })

    // 監聽 crosshair 移動
    chartInstance.subscribeCrosshairMove((param: unknown) => {
      emit('chart-crosshair-move', param as object)
    })
  }
}

// Watch data changes
watch(
  () => props.data,
  (newData) => {
    if (newData && newData.length > 0) {
      setData(newData)
    }
  },
  { deep: true }
)

// Watch width/height changes
watch(
  [() => props.width, () => props.height],
  ([newWidth, newHeight]) => {
    resizeChart(newWidth, newHeight)
  }
)

// Watch config changes
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig && Object.keys(newConfig).length > 0) {
      applyChartOptions(newConfig as Parameters<typeof applyChartOptions>[0])
    }
  },
  { deep: true }
)

// Lifecycle
// Note: initChartInstance should be called from parent via ref, or use onMounted
// For now, we'll initialize when chartRef is available
watch(chartRef, (newVal) => {
  if (newVal) {
    initChartInstance()
  }
})

// Expose methods for parent component
defineExpose({
  updateData,
  resizeChart,
  setData,
  destroyChart,
})
</script>

<style scoped>
.stock-chart {
  position: relative;
  display: inline-block;
}

.chart-container {
  background: #ffffff;
  border-radius: 4px;
  overflow: hidden;
}

.chart-loading,
.chart-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 14px;
}

.chart-loading {
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
}

.chart-error {
  background: #fee;
  color: #c00;
}
</style>
