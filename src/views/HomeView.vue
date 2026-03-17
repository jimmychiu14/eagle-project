<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '@/stores/stockStore'

const router = useRouter()
const stockStore = useStockStore()

const stockId = ref('')
const recentSearches = ref<string[]>([])

const popularStocks = [
  { id: '2330.TW', name: '台積電' },
  { id: '6770.TW', name: '力積電' },
  { id: '2317.TW', name: '鴻海' },
  { id: '2454.TW', name: '聯發科' },
  { id: '2881.TW', name: '富邦金' },
  { id: '0050.TW', name: '元大台灣50' },
]

onMounted(() => {
  // Load recent searches from localStorage
  const saved = localStorage.getItem('eagle_recent_searches')
  if (saved) {
    recentSearches.value = JSON.parse(saved)
  }
})

async function searchStock() {
  if (!stockId.value) return
  addToRecent(stockId.value)
  await stockStore.fetchStockData(stockId.value)
  router.push(`/stock/${stockId.value}`)
}

function goToStock(stock: string, name: string) {
  stockId.value = stock
  router.push({ path: `/stock/${stock}`, query: { name } })
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
            @click="goToStock(stock, stock)"
          >
            {{ stock }}
          </button>
        </div>
      </section>
    </main>
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
</style>
