# Grafana + InfluxDB（k6 real-time）

本地用 Docker 跑 InfluxDB v1 與 Grafana，讓 k6 的指標即時寫入並在 Grafana 檢視。

## 啟動

```bash
docker compose up -d
```

- **InfluxDB**: http://localhost:8087
- **Grafana**: http://localhost:3000（預設帳密 `admin` / `admin`）

## Grafana 設定 InfluxDB 資料來源

1. 登入 Grafana → **Connections** → **Data sources** → **Add data source**
2. 選擇 **InfluxDB**
3. **Query Language**: InfluxQL
4. **URL**: `http://influxdb:8086`（Grafana 在 Docker 內用此即可；若 Grafana 跑在 host 則用 `http://localhost:8087`）
5. **Database**: `k6`
6. **User** / **Password**: 若未改 docker-compose 則留空（InfluxDB 預設無認證）
7. 儲存並 **Save & test**

## 執行 k6 並寫入 InfluxDB

在專案根目錄或 `load-test/` 下執行（需先啟動 Mock API 與 Grafana stack）：

```bash
# 從專案根目錄
cd load-test
k6 run --out influxdb=http://localhost:8087/k6 tests/api-load.test.js
```

## 匯入 k6 儀表板

1. Grafana → **Dashboards** → **Import**
2. 輸入 ID: **24708**
3. 選擇剛建立的 InfluxDB 資料來源
4. 匯入後即可看到請求數、延遲、錯誤率等即時圖表

[Dashboard 24708 - k6 Load Test (InfluxDB v1.x)](https://grafana.com/grafana/dashboards/24708)
