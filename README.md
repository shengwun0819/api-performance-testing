# k6 Load Testing

以 [k6](https://k6.io/) 為主的 API 負載測試範例，含 Mock API 伺服器、可視化報表與可選的 Grafana real-time dashboard。

## 專案結構

```
.
├── package.json          # 根目錄：ESLint 與 npm run lint
├── mock-server/          # Mock API（GET / POST / PATCH / PUT / DELETE）
├── load-test/            # k6 測試腳本與設定
│   ├── config.example.json
│   ├── tests/
│   ├── load_test/        # (選用) webpack 建置輸出
│   ├── report/
│   └── webpack.config.js  # (選用) 與 sygna-load-test bridge 相同建置方式
├── grafana/              # (選用) InfluxDB + Grafana 即時觀測
│   └── docker-compose.yml
└── README.md
```

## 環境需求

- [Node.js](https://nodejs.org/) 20+
- [k6](https://k6.io/docs/get-started/installation/) **v0.49.0 以上**（Web Dashboard 與 HTML 匯出需要；例：`brew install k6` 或 `brew upgrade k6`）
- (選用) Docker、Docker Compose（用於 Grafana 即時觀測）

## 快速開始

### 1. 啟動 Mock API

```bash
cd mock-server
npm install
npm start
# Mock API 預設在 http://localhost:4000
```

### 2. 設定 Load Test

```bash
cd load-test
cp config.example.json config.json
# 編輯 config.json：確認 BASE_URL 為 http://localhost:4000（或你的 Mock API 位址）
```

### 3. 執行負載測試

```bash
cd load-test

# 使用 config.json 的設定（6 個 scenario：GET/POST/PATCH/PUT/DELETE）
k6 run tests/api-load.test.js

# 以環境變數覆寫
BASE_URL=http://localhost:4000 k6 run tests/api-load.test.js
```

⚠️ 注意：若在指令列加上 `--duration`、`--vus` 等，會覆寫腳本內的 `options`，變成單一 default scenario；要跑完整 6 個 scenario 請不要加這些參數。

### 4. 產出報表

**升級 k6（Web Dashboard 與 HTML 匯出需要 v0.49.0+）：**

```bash
k6 version   # 若低於 v0.49.0 請升級
brew upgrade k6   # macOS Homebrew
# 或至 https://grafana.com/docs/k6/latest/set-up/install-k6/ 依平台安裝最新版
```

**終端摘要（預設）：** 每次執行結束都會在終端顯示 `textSummary`。

**HTML 報表 + 即時 Web Dashboard（k6 內建）：**

| 情境 | 指令 | 說明 |
|------|------|------|
| 產出單一 HTML 檔 | `K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=report/api-load.html k6 run ...` | 結束後開啟 `load-test/report/api-load.html`；圖表需測試時間 > 約 30s 才會出現 |
| 即時網頁觀看 | `K6_WEB_DASHBOARD=true k6 run ...` | 執行後開啟 http://127.0.0.1:5665 ，可邊跑邊看曲線，結束前在畫面上按 Report 匯出 HTML |

```bash
cd load-test
# 產出 report/api-load.html
K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=report/api-load.html k6 run tests/api-load.test.js
```

**使用 package.json scripts（在 `load-test/` 目錄下）：**

| 指令 | 說明 |
|------|------|
| `npm run test` | 只跑測試，終端摘要 |
| `npm run test:grafana` | 跑測試並寫入 InfluxDB，Grafana 可即時看 |
| `npm run test:report` | 跑測試並產出 `report/api-load.html` |
| `npm run test:report:grafana` | 跑測試 + 產出 HTML + 寫入 InfluxDB |
| `npm run build` | 以 webpack 建置（輸出至 `load_test/`） |
| `npm run test:bundled` | 執行建置後的腳本（需先 `npm run build`） |
| `npm run test:bundled:grafana` | 建置版 + 寫入 InfluxDB |

**Grafana 即時儀表板**：見下方「Grafana 即時觀測」。

### 程式碼檢查 (ESLint)

在**專案根目錄**執行：

```bash
npm install
npm run lint
```

會檢查 `mock-server/`、`load-test/tests/`、`load-test/webpack.config.js`，並忽略 `node_modules` 與 webpack 建置輸出（`load_test/`）。

## 報表方式整理

| 方式 | 說明 |
|------|------|
| **stdout** | 預設，結束時在終端顯示 `textSummary`。 |
| **K6_WEB_DASHBOARD** | k6 ≥ v0.49.0：即時網頁 http://127.0.0.1:5665 。 |
| **K6_WEB_DASHBOARD_EXPORT** | 測試結束時自動寫入指定路徑的 HTML（含圖表）。 |
| **Grafana** | 需搭配 InfluxDB，即時觀測（見下方「Grafana 即時觀測」）。 |

## 選用：Webpack 建置

與 sygna-load-test 的 bridge 相同，可用 webpack 將測試腳本打包成單一檔案後再交給 k6 執行。

- **預設流程**：直接執行 `k6 run tests/api-load.test.js` 或上述 `npm run test` 等，無需建置。
- **建置流程**：在 `load-test/` 執行 `npm run build`，會產出 `load_test/api_load_test.test.js`；之後可用 `npm run test:bundled` 或 `npm run test:bundled:grafana` 執行打包版。建置產物已列入 `.gitignore`。

若不需要與既有 CI 或 bridge 專案共用同一套建置方式，可略過此步驟。

## (optional) Grafana 即時觀測

使用 InfluxDB v1 儲存 k6 指標，並用 Grafana 即時檢視。

### 啟動 InfluxDB + Grafana

```bash
cd grafana
docker compose up -d
# InfluxDB: http://localhost:8087（若本機 8086 已被佔用則對應 8087）
# Grafana:  http://localhost:3000（預設帳密 admin / admin）
```

### Grafana 設定 InfluxDB 資料來源

1. 登入 Grafana → Configuration → Data sources → Add data source。
2. 選 **InfluxDB**。
3. URL: `http://influxdb:8086`（Grafana 在 Docker 內用此即可；若 Grafana 在 host 則用 `http://localhost:8087`）。
4. Database: `k6`。
5. 點擊 Test & Save 測試連線狀態。

### 執行 k6 並寫入 InfluxDB

```bash
cd load-test
k6 run --out influxdb=http://localhost:8087/k6 tests/api-load.test.js
# 或使用 script：npm run test:grafana
```

### 匯入 k6 儀表板

在 Grafana 中：Dashboard → Import → 輸入 ID **24708**（[k6 Load Test Dashboard - InfluxDB v1.x](https://grafana.com/grafana/dashboards/24708))，選擇剛建立的 InfluxDB 資料來源後匯入。

## Mock API 端點

| Method | 路徑 | 說明 |
|--------|------|------|
| GET | `/api/items` | 取得所有項目（可選 `?limit=&offset=`） |
| GET | `/api/items/:id` | 取得單一項目 |
| POST | `/api/items` | 新增項目（body: `{ "name": "...", "value": 0 }`） |
| PATCH | `/api/items/:id` | 部分更新 |
| PUT | `/api/items/:id` | 全部更新 |
| DELETE | `/api/items/:id` | 刪除項目 |

健康檢查：`GET /health` 回傳 200。

## License

MIT
