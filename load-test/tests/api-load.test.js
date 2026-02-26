/**
 * k6 API load test - targets Mock Server (GET, POST, PATCH, PUT, DELETE).
 * Config: load-test/config.json (copy from config.example.json).
 */
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';
import { group, sleep } from 'k6';
import http from 'k6/http';

import { checkStatus, checkStatusOk } from './utils.js';

// Load config (run from load-test/ so config.json is next to load-test/; copy from config.example.json)
let config;
try {
  config = JSON.parse(open('../config.json'));
} catch (_) {
  config = JSON.parse(open('../config.example.json'));
}

const BASE_URL = __ENV.BASE_URL || config.BASE_URL || 'http://localhost:4000';
const duration = __ENV.K6_DURATION || config.K6_DURATION || '30s';
const timeUnit = __ENV.K6_TIME_UNIT || config.K6_TIME_UNIT || '1s';
const rate = __ENV.K6_RATE || config.K6_RATE || '10';
const vus = parseInt(__ENV.K6_VUS || config.K6_VUS || '20', 10);
const preAllocatedVUs = Math.min(vus, 50);

export const options = {
  discardResponseBodies: false,
  scenarios: {
    list_items: {
      executor: 'constant-arrival-rate',
      exec: 'getItems',
      rate: parseInt(rate, 10),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
    get_item: {
      executor: 'constant-arrival-rate',
      exec: 'getItemById',
      rate: parseInt(rate, 10),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
    create_item: {
      executor: 'constant-arrival-rate',
      exec: 'postItem',
      rate: Math.max(1, Math.floor(parseInt(rate, 10) / 2)),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
    update_item: {
      executor: 'constant-arrival-rate',
      exec: 'patchItem',
      rate: Math.max(1, Math.floor(parseInt(rate, 10) / 2)),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
    put_item: {
      executor: 'constant-arrival-rate',
      exec: 'putItem',
      rate: Math.max(1, Math.floor(parseInt(rate, 10) / 2)),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
    delete_item: {
      executor: 'constant-arrival-rate',
      exec: 'deleteItem',
      rate: Math.max(1, Math.floor(parseInt(rate, 10) / 2)),
      timeUnit,
      duration,
      preAllocatedVUs,
      maxVUs: vus,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const headers = { 'Content-Type': 'application/json' };

export function setup() {
  // Seed items for GET by id / PATCH / PUT (DELETE uses items created during test, not this pool)
  const ids = [];
  for (let i = 0; i < 50; i++) {
    const res = http.post(
      `${BASE_URL}/api/items`,
      JSON.stringify({ name: `seed-${i}`, value: i }),
      { headers }
    );
    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        if (body.data && body.data.id) ids.push(body.data.id);
      } catch (_) {}
    }
  }
  return { createdIds: ids };
}

export function getItems() {
  group('GET /api/items', () => {
    const limit = randomIntBetween(5, 50);
    const offset = randomIntBetween(0, 20);
    const res = http.get(`${BASE_URL}/api/items?limit=${limit}&offset=${offset}`, { headers });
    checkStatus(res);
    sleep(0.1);
  });
}

export function getItemById(data) {
  group('GET /api/items/:id', () => {
    if (data.createdIds.length === 0) {
      getItems();
      return;
    }
    const id = randomItem(data.createdIds);
    const res = http.get(`${BASE_URL}/api/items/${id}`, { headers });
    checkStatus(res);
    sleep(0.1);
  });
}

export function postItem() {
  group('POST /api/items', () => {
    const name = `load-${Date.now()}-${randomIntBetween(1, 99999)}`;
    const value = randomIntBetween(0, 100);
    const res = http.post(
      `${BASE_URL}/api/items`,
      JSON.stringify({ name, value }),
      { headers }
    );
    checkStatusOk(res, [200, 201]);
    sleep(0.1);
  });
}

export function patchItem(data) {
  group('PATCH /api/items/:id', () => {
    if (data.createdIds.length === 0) {
      postItem();
      return;
    }
    const id = randomItem(data.createdIds);
    const res = http.patch(
      `${BASE_URL}/api/items/${id}`,
      JSON.stringify({ value: randomIntBetween(0, 100) }),
      { headers }
    );
    checkStatus(res);
    sleep(0.1);
  });
}

export function putItem(data) {
  group('PUT /api/items/:id', () => {
    if (data.createdIds.length === 0) {
      postItem();
      return;
    }
    const id = randomItem(data.createdIds);
    const res = http.put(
      `${BASE_URL}/api/items/${id}`,
      JSON.stringify({ name: `put-${id}`, value: randomIntBetween(0, 100) }),
      { headers }
    );
    checkStatus(res);
    sleep(0.1);
  });
}

export function deleteItem() {
  // 先 POST 一筆再 DELETE，避免消耗 setup 的 ID 池導致 GET/PATCH/PUT 大量 404
  group('DELETE /api/items/:id', () => {
    const createRes = http.post(
      `${BASE_URL}/api/items`,
      JSON.stringify({ name: `del-${randomIntBetween(1, 99999)}`, value: 0 }),
      { headers }
    );
    if (createRes.status !== 201) {
      checkStatusOk(createRes, [200, 201]);
      sleep(0.1);
      return;
    }
    let id;
    try {
      const body = JSON.parse(createRes.body);
      id = body.data && body.data.id;
    } catch (_) {}
    if (!id) {
      sleep(0.1);
      return;
    }
    const res = http.del(`${BASE_URL}/api/items/${id}`, null, { headers });
    checkStatusOk(res, [200, 204]);
    sleep(0.1);
  });
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Fallback when run without scenarios (e.g. k6 run script.js without options)
export default function (_data) {
  getItems();
}
