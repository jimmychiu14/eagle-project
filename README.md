# 翔鷹專案 - 股票觀察程式

## 專案概述

一個協助投資決策的股票觀察程式，幫助追蹤個股、財報、技術指標，並提供價格提醒功能。

---

## 功能清單

| 功能 | 說明 |
|------|------|
| 📊 股價追蹤 | 自動抓取指定股票的即時/歷史股價 |
| 📈 技術指標 | K線、均線、RSI、MACD |
| 📋 財報追蹤 | 營收、EPS，毛利率、ROE |
| 🔔 價格提醒 | 漲跌幅超過設定值時通知 |
| 📰 新聞彙整 | 相關新聞自動蒐集 |
| 💼 投資組合 | 記錄買賣水位、計算損益 |
| 📝 觀察名單 | 把有興趣的股票列入追蹤 |
| 📉 警示指標 | 本益比、殖利率異常提醒 |

---

## 開發階段

### 第一階段（基礎）
- 讀取股價 API
- 顯示股價 dashboard
- 觀察名單功能

### 第二階段（進階）
- 財報數據追蹤
- 價格提醒

### 第三階段（完整）
- 投資組合管理
- 損益計算
- 新聞彙整

---

## 技術選型

- 程式語言：TypeScript
- 前端框架：Vue 3
- 建置工具：Vite
- 狀態管理：Pinia
- 路由：Vue Router
- 圖表：ECharts（個股頁 K 線與技術指標）
- 資料來源：FinMind 股價 API、TWSE 財報 API，失敗時回退使用 mock data

---

## 開發指令

```bash
npm install
npm run dev
npm run build
npm run preview
```

## 專案結構

- `src/views/HomeView.vue`：首頁、搜尋、熱門股票、近期搜尋、觀察名單
- `src/views/StockView.vue`：個股報價、K 線圖、技術指標、財報資訊
- `src/stores/stockStore.ts`：股價與財報資料狀態
- `src/stores/watchlistStore.ts`：觀察名單與價格提醒狀態
- `src/services/api/finmindClient.ts`：FinMind API client
- `src/services/api/twseFinancialClient.ts`：TWSE 財報 API client
- `src/utils/mockData.ts`：API 失敗時使用的模擬資料

---

## 討論記錄

- 2026-03-02：專案命名為「翔鷹專案」，擬定初步功能清單與開發階段
