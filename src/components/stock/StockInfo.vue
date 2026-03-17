<template>
  <div class="stock-info">
    <!-- 股票代碼與名稱 -->
    <div class="stock-header">
      <span class="stock-symbol">{{ stock.symbol }}</span>
      <span class="stock-name">{{ stock.name }}</span>
    </div>

    <!-- 價格與漲跌 -->
    <div class="stock-price-section">
      <span class="stock-price" :class="priceClass">
        {{ formatPrice(quote?.price) }}
      </span>
      <span class="stock-change" :class="priceClass">
        <template v-if="quote">
          {{ quote.change >= 0 ? '+' : '' }}{{ formatPrice(quote.change) }}
          ({{ quote.changePercent >= 0 ? '+' : '' }}{{ formatPercent(quote.changePercent) }})
        </template>
      </span>
    </div>

    <!-- 基本資訊網格 -->
    <div class="stock-details">
      <div class="detail-item">
        <span class="detail-label">開盤</span>
        <span class="detail-value">{{ formatPrice(quote?.open) }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">最高</span>
        <span class="detail-value">{{ formatPrice(quote?.high) }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">最低</span>
        <span class="detail-value">{{ formatPrice(quote?.low) }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">成交量</span>
        <span class="detail-value">{{ formatVolume(quote?.volume) }}</span>
      </div>
    </div>

    <!-- 市場/交易所標籤 -->
    <div v-if="stock.market || stock.exchange" class="stock-tags">
      <span v-if="stock.market" class="tag">{{ stock.market }}</span>
      <span v-if="stock.exchange" class="tag">{{ stock.exchange }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StockInfo, StockQuote } from '@/types/stock'

// Props
interface Props {
  stock: StockInfo
  quote?: StockQuote | null
}

const props = defineProps<Props>()

// 價格漲跌樣式
const priceClass = computed(() => {
  if (!props.quote) return ''
  return props.quote.change >= 0 ? 'price-up' : 'price-down'
})

// 格式化價格
const formatPrice = (price?: number): string => {
  if (price === undefined || price === null) return '-'
  return price.toFixed(2)
}

// 格式化漲跌百分比
const formatPercent = (percent?: number): string => {
  if (percent === undefined || percent === null) return '-'
  return `${percent.toFixed(2)}%`
}

// 格式化成交量
const formatVolume = (volume?: number): string => {
  if (volume === undefined || volume === null) return '-'
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}億`
  }
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}萬`
  }
  return volume.toString()
}
</script>

<style scoped>
.stock-info {
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stock-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.stock-symbol {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.stock-name {
  font-size: 16px;
  color: #666;
}

.stock-price-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.stock-price {
  font-size: 32px;
  font-weight: 600;
}

.stock-change {
  font-size: 16px;
  font-weight: 500;
}

.price-up {
  color: #26a69a;
}

.price-down {
  color: #ef5350;
}

.stock-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #999;
}

.detail-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.stock-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.tag {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
