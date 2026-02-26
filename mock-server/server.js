/**
 * Mock API server for k6 load testing.
 * Supports: GET, POST, PATCH, PUT, DELETE on /api/items
 */
const http = require('http');

const PORT = Number(process.env.PORT) || 4000;

// In-memory store
const items = new Map();
let nextId = 1;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

function notFound(res) {
  send(res, 404, { error: 'Not Found' });
}

const router = {
  'GET /health': (req, res) => {
    send(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
  },

  'GET /api/items': (req, res, url) => {
    const u = new URL(url, `http://localhost:${PORT}`);
    const limit = Math.min(1000, Math.max(1, parseInt(u.searchParams.get('limit') || '100', 10)));
    const offset = Math.max(0, parseInt(u.searchParams.get('offset') || '0', 10));
    const list = Array.from(items.values()).slice(offset, offset + limit);
    send(res, 200, { data: list, total: items.size });
  },

  'GET /api/items/:id': (req, res, url, id) => {
    const item = items.get(id);
    if (!item) return notFound(res);
    send(res, 200, { data: item });
  },

  'POST /api/items': async (req, res) => {
    try {
      const body = await parseBody(req);
      const id = String(nextId++);
      const item = {
        id,
        name: body.name != null ? String(body.name) : `item-${id}`,
        value: typeof body.value === 'number' ? body.value : 0,
        createdAt: new Date().toISOString(),
      };
      items.set(id, item);
      send(res, 201, { data: item });
    } catch (e) {
      send(res, 400, { error: 'Invalid JSON or body' });
    }
  },

  'PATCH /api/items/:id': async (req, res, url, id) => {
    const item = items.get(id);
    if (!item) return notFound(res);
    try {
      const body = await parseBody(req);
      if (body.name !== undefined) item.name = String(body.name);
      if (typeof body.value === 'number') item.value = body.value;
      item.updatedAt = new Date().toISOString();
      send(res, 200, { data: item });
    } catch (e) {
      send(res, 400, { error: 'Invalid JSON or body' });
    }
  },

  'PUT /api/items/:id': async (req, res, url, id) => {
    const existing = items.get(id);
    if (!existing) return notFound(res);
    try {
      const body = await parseBody(req);
      const item = {
        id,
        name: body.name != null ? String(body.name) : existing.name,
        value: typeof body.value === 'number' ? body.value : existing.value,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      items.set(id, item);
      send(res, 200, { data: item });
    } catch (e) {
      send(res, 400, { error: 'Invalid JSON or body' });
    }
  },

  'DELETE /api/items/:id': (req, res, url, id) => {
    if (!items.has(id)) return notFound(res);
    items.delete(id);
    send(res, 200, { deleted: id });
  },
};

function route(req, res, url, pathname, id) {
  const method = req.method;

  if (pathname === '/health' && method === 'GET') {
    return router['GET /health'](req, res);
  }
  if (pathname === '/api/items' && method === 'GET') {
    return router['GET /api/items'](req, res, url);
  }
  if (pathname === '/api/items' && method === 'POST') {
    return router['POST /api/items'](req, res);
  }
  if (pathname.startsWith('/api/items/') && id) {
    if (method === 'GET') return router['GET /api/items/:id'](req, res, url, id);
    if (method === 'PATCH') return router['PATCH /api/items/:id'](req, res, url, id);
    if (method === 'PUT') return router['PUT /api/items/:id'](req, res, url, id);
    if (method === 'DELETE') return router['DELETE /api/items/:id'](req, res, url, id);
  }

  send(res, 404, { error: 'Not Found' });
}

const server = http.createServer(async (req, res) => {
  const url = `http://localhost:${PORT}${req.url}`;
  const pathname = new URL(url).pathname;
  const match = pathname.match(/^\/api\/items\/([^/]+)$/);
  const id = match ? match[1] : null;
  route(req, res, url, pathname, id);
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
  console.log('  GET  /health');
  console.log('  GET  /api/items');
  console.log('  GET  /api/items/:id');
  console.log('  POST /api/items');
  console.log('  PATCH /api/items/:id');
  console.log('  PUT  /api/items/:id');
  console.log('  DELETE /api/items/:id');
});
