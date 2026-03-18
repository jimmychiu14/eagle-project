<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'
import { useWatchlistStore } from '@/stores/watchlistStore'
import { twseClient } from '@/services/api/twseClient'
import { generateMockStockData, formatNumber, formatVolume } from '@/utils/mockData'

const router = useRouter()
const stockStore = useStockStore()
const watchlistStore = useWatchlistStore()

const stockId = ref('')
const recentSearches = ref<string[]>([])

// 新增觀察名單對話框
const showAddDialog = ref(false)
const newWatchlistId = ref('')
const newWatchlistName = ref('')

// 股票代碼對應名稱
const stockNames: Record<string, string> = {
  '2330.TW': '台積電',
  '6770.TW': '力積電',
  '2317.TW': '鴻海',
  '2454.TW': '聯發科',
  '2881.TW': '富邦金',
  '0050.TW': '元大台灣50',
  '2303.TW': '聯電',
  '3008.TW': '大立光',
  '2002.TW': '中鋼',
  '5880.TW': '合庫金'
}

const popularStocks = [
  { id: '2330.TW', name: '台積電' },
  { id: '6770.TW', name: '力積電' },
  { id: '2317.TW', name: '鴻海' },
  { id: '2454.TW', name: '聯發科' },
  { id: '2881.TW', name: '富邦金' },
  { id: '0050.TW', name: '元大台灣50' },
]

// 計算觀察名單漲跌顏色
function getChangeClass(change: number | undefined): string {
  if (change === undefined) return ''
  return change > 0 ? 'up' : change < 0 ? 'down' : ''
}

// 載入觀察名單的價格資料
async function loadWatchlistPrices() {
  for (const item of watchlistStore.watchlist) {
    try {
      const quote = await twseClient.getQuote(item.id)
      if (quote) {
        watchlistStore.updateStockPrice(item.id, quote.price, quote.change, quote.changePercent)
      } else {
        // Fallback to mock data
        const data = generateMockStockData(item.id, 2)
        if (data.length >= 2) {
          const yesterday = data[data.length - 2]
          const today = data[data.length - 1]
          const change = today.close - yesterday.close
          const changePercent = (change / yesterday.close) * 100
          watchlistStore.updateStockPrice(item.id, today.close, change, changePercent)
        }
      }
    } catch (error) {
      console.warn(`Failed to load price for ${item.id}:`, error)
      // Fallback to mock data on error
      const data = generateMockStockData(item.id, 2)
      if (data.length >= 2) {
        const yesterday = data[data.length - 2]
        const today = data[data.length - 1]
        const change = today.close - yesterday.close
        const changePercent = (change / yesterday.close) * 100
        watchlistStore.updateStockPrice(item.id, today.close, change, changePercent)
      }
    }
  }
}

// 檢查價格提醒
function checkAlerts() {
  watchlistStore.watchlist.forEach(item => {
    const triggered = watchlistStore.checkPriceAlert(item.id)
    if (triggered) {
      const direction = triggered.changePercent! > 0 ? '漲' : '跌'
      alert(`🚨 價格提醒：${triggered.name} (${triggered.id})\n${direction}幅已達 ${Math.abs(triggered.changePercent!).toFixed(2)}%\n(設定門檻: ±${triggered.alertThreshold}%)`)
    }
  })
}

onMounted(async () => {
  // Load recent searches from localStorage
  const saved = localStorage.getItem('eagle_recent_searches')
  if (saved) {
    recentSearches.value = JSON.parse(saved)
  }
  
  // 載入觀察名單價格並檢查提醒
  await loadWatchlistPrices()
  checkAlerts()
})

async function searchStock() {
  if (!stockId.value) return
  addToRecent(stockId.value)
  await stockStore.fetchStockData(stockId.value)
  router.push(`/stock/${stockId.value}`)
}

function goToStock(stock: string, name?: string) {
  const stockName = name || stockNames[stock] || stock.replace('.TW', '')
  router.push({ path: `/stock/${stock}`, query: { name: stockName } })
}

function addToRecent(stock: string) {
  const updated = [stock, ...recentSearches.value.filter(s => s !== stock)].slice(0, 5)
  recentSearches.value = updated
  localStorage.setItem('eagle_recent_searches', JSON.stringify(updated))
}

function formatDate() {
  const now = new Date()
  const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  return `${now.getMonth() + 1}/${now.getDate()} ${weekdays[now.getDay()]}`
}

// 開啟新增觀察名單對話框
function openAddDialog() {
  newWatchlistId.value = ''
  newWatchlistName.value = ''
  showAddDialog.value = true
}

// 新增觀察名單
function addToWatchlist() {
  if (!newWatchlistId.value) return
  
  // 自動判斷名稱
  const name = newWatchlistName.value || stockNames[newWatchlistId.value] || newWatchlistId.value.replace('.TW', '')
  const id = newWatchlistId.value.includes('.TW') ? newWatchlistId.value : `${newWatchlistId.value}.TW`
  
  watchlistStore.addToWatchlist(id, name)
  showAddDialog.value = false
  loadWatchlistPrices()
}

// 移除觀察名單
function removeWatchlist(id: string) {
  watchlistStore.removeFromWatchlist(id)
}

// 設定價格提醒
function setAlert(id: string) {
  const threshold = prompt('請輸入價格漲跌幅門檻（%）:', '5')
  if (threshold) {
    const value = parseFloat(threshold)
    if (!isNaN(value) && value > 0) {
      watchlistStore.setAlertThreshold(id, value)
      alert(`已設定 ${watchlistStore.watchlist.find(w => w.id === id)?.name} 的價格提醒為 ±${value}%`)
    }
  }
}

// 檢查是否在觀察名單
const isWatched = (id: string) => watchlistStore.isInWatchlist(id)
</script>

<template>
  <div class="home">
    <header class="header">
      <h1>🦅 Eagle</h1>
      <p class="date">{{ formatDate() }}</p>
    </header>

    <main>
      <!-- Search Box -->
      <div class="search-box">
        <div class="search-input">
          <input
            v-model="stockId"
            type="text"
            placeholder="輸入股票代碼..."
            @keyup.enter="searchStock"
          />
          <button @click="searchStock" :disabled="stockStore.isLoading">
            {{ stockStore.isLoading ? '...' : '查詢' }}
          </button>
        </div>
      </div>

      <!-- Popular Stocks -->
      <section class="section">
        <h3>🔥 熱門股票</h3>
        <div class="stock-grid">
          <button
            v-for="stock in popularStocks"
            :key="stock.id"
            class="stock-chip"
            @click="goToStock(stock.id, stock.name)"
          >
            <span class="stock-id">{{ stock.id }}</span>
            <span class="stock-name">{{ stock.name }}</span>
          </button>
        </div>
      </section>

      <!-- Recent Searches -->
      <section v-if="recentSearches.length" class="section">
        <h3>📌 近期搜尋</h3>
        <div class="stock-grid">
          <button
            v-for="stock in recentSearches"
            :key="stock"
            class="stock-chip recent"
            @click="goToStock(stock, stockNames[stock] || stock)"
          >
            {{ stock }}
          </button>
        </div>
      </section>

      <!-- 觀察名單 -->
      <section class="section">
        <div class="section-header">
          <h3>👁️ 觀察名單</h3>
          <button class="add-btn" @click="openAddDialog">+ 新增</button>
        </div>
        
        <div v-if="watchlistStore.watchlist.length === 0" class="empty-state">
          <p>尚無觀察名單</p>
          <p class="hint">點擊「+ 新增」加入股票</p>
        </div>
        
        <div v-else class="watchlist">
          <div
            v-for="item in watchlistStore.watchlist"
            :key="item.id"
            class="watchlist-item"
            @click="goToStock(item.id, item.name)"
          >
            <div class="stock-info">
              <span class="stock-id">{{ item.id }}</span>
              <span class="stock-name">{{ item.name }}</span>
              <span v-if="item.alertThreshold" class="alert-badge">🔔 {{ item.alertThreshold }}%</span>
            </div>
            <div class="stock-price">
              <span v-if="item.price" class="price">{{ item.price.toFixed(2) }}</span>
              <span 
                v-if="item.changePercent !== undefined" 
                class="change"
                :class="getChangeClass(item.change)"
              >
                {{ item.changePercent > 0 ? '+' : '' }}{{ item.changePercent?.toFixed(2) }}%
              </span>
            </div>
            <div class="stock-actions">
              <button 
                class="action-btn alert" 
                @click.stop="setAlert(item.id)"
                :title="item.alertThreshold ? '修改提醒' : '設定提醒'"
              >
                {{ item.alertThreshold ? '🔔' : '🔕' }}
              </button>
              <button 
                class="action-btn delete" 
                @click.stop="removeWatchlist(item.id)"
                title="移除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 新增觀察名單對話框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="showAddDialog = false">
      <div class="dialog">
        <h3>加入觀察名單</h3>
        <div class="form-group">
          <label>股票代碼</label>
          <input 
            v-model="newWatchlistId" 
            type="text" 
            placeholder="如：2330.TW"
            @keyup.enter="addToWatchlist"
          />
        </div>
        <div class="form-group">
          <label>股票名稱（可選）</label>
          <input 
            v-model="newWatchlistName" 
            type="text" 
            placeholder="如：台積電"
          />
        </div>
        <div class="dialog-buttons">
          <button class="btn-cancel" @click="showAddDialog = false">取消</button>
          <button class="btn-confirm" @click="addToWatchlist">新增</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin: 0;
}

.header .date {
  color: #888;
  margin-top: 0.25rem;
}

.search-box {
  margin-bottom: 2rem;
}

.search-input {
  display: flex;
  gap: 0.5rem;
}

.search-input input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: border-color 0.2s;
}

.search-input input:focus {
  outline: none;
  border-color: #3498db;
}

.search-input button {
  padding: 0 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.search-input button:hover:not(:disabled) {
  background: #2980b9;
}

.search-input button:disabled {
  opacity: 0.6;
}

.section {
  margin-bottom: 1.5rem;
}

.section h3 {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stock-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stock-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.stock-chip:hover {
  border-color: #3498db;
  background: #f8f9fa;
  transform: translateY(-1px);
}

.stock-chip .stock-id {
  font-weight: 600;
  color: #2c3e50;
}

.stock-chip .stock-name {
  font-size: 0.85rem;
  color: #888;
}

.stock-chip.recent {
  background: #f0f7ff;
  border-color: #3498db;
}

/* 觀察名單樣式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-header h3 {
  margin-bottom: 0;
}

.add-btn {
  padding: 0.25rem 0.75rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #2980b9;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #888;
  background: #f8f9fa;
  border-radius: 12px;
}

.empty-state .hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.watchlist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.watchlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.watchlist-item:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stock-info .stock-id {
  font-weight: 600;
  color: #2c3e50;
}

.stock-info .stock-name {
  font-size: 0.85rem;
  color: #888;
}

.alert-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  background: #fff3cd;
  color: #856404;
  border-radius: 8px;
}

.stock-price {
  text-align: right;
}

.stock-price .price {
  font-weight: 600;
  color: #2c3e50;
}

.stock-price .change {
  display: block;
  font-size: 0.85rem;
}

.stock-price .change.up {
  color: #ef5350;
}

.stock-price .change.down {
  color: #26a69a;
}

.stock-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.action-btn.alert {
  background: #f0f7ff;
  color: #f0ad4e;
}

.action-btn.alert:hover {
  background: #d4edda;
}

.action-btn.delete {
  background: #fff0f0;
  color: #dc3545;
}

.action-btn.delete:hover {
  background: #dc3545;
  color: white;
}

/* 對話框樣式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  width: 90%;
  max-width: 350px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin: 0 0 1rem;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.dialog-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm {
  padding: 0.5rem 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm:hover {
  background: #2980b9;
}
</style>
