import { createServer as createHttpServer } from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { resolve, normalize, join, extname } from 'node:path';
import { URL } from 'node:url';
import { initDatabase } from './db.mjs';
import { seedDatabaseIfEmpty } from './seed.mjs';
import { authenticateToken, createSession, deleteSession, verifyPassword } from './auth.mjs';
import {
  createStore,
  updateStore,
  createProduct,
  updateProduct,
  createClient,
  updateClient,
  previewPurchase,
  createPurchase,
  generateStatements,
  getStatementDetail,
  payStatement,
  exportStatementCSV,
  getBootstrapData,
} from './domain.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const MAX_BODY_BYTES = 64 * 1024; // 64 KiB early cap
const loginAttempts = new Map(); // ip -> { count, resetAt }

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && record.resetAt > now) {
    if (record.count >= 10) {
      return false;
    }
  } else {
    loginAttempts.set(ip, { count: 0, resetAt: now + 60 * 1000 });
  }
  return true;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && record.resetAt > now) {
    record.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60 * 1000 });
  }
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Sends a JSON response with proper headers and status code.
 */
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/**
 * Sends a standard error response.
 */
function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

/**
 * Reads and parses request body as JSON.
 * Enforces 64 KiB maximum body size, early termination on overflow,
 * and rejects malformed non-object JSON (scalars, arrays, null).
 */
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyLength = 0;
    let oversized = false;
    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      if (oversized) return;
      bodyLength += Buffer.byteLength(chunk);
      if (bodyLength > MAX_BODY_BYTES) {
        oversized = true;
        body = '';
        const err = new Error('Payload Too Large');
        err.statusCode = 413;
        reject(err);
        // Drain without buffering; destroying the socket would discard the 413 response.
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (oversized) return;
      if (!body || body.trim() === '') {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          const err = new Error('Request body must be a JSON object');
          err.statusCode = 400;
          reject(err);
          return;
        }
        resolve(parsed);
      } catch {
        const err = new Error('Invalid JSON format');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

/**
 * Safely serves static frontend build files from dist/credit-drive/browser.
 * Implements strict directory traversal checks and SPA index.html fallback.
 */
function serveStaticFile(req, res, distDir, pathname) {
  const normalized = normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = join(distDir, normalized);

  if (!filePath.startsWith(distDir)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  if (existsSync(filePath)) {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback to index.html if request doesn't match an existing file
  const indexHtml = join(distDir, 'index.html');
  if (existsSync(indexHtml) && statSync(indexHtml).isFile()) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    createReadStream(indexHtml).pipe(res);
    return;
  }

  sendError(res, 404, 'Not Found');
}

/**
 * Creates the HTTP application and request router.
 * Exports app/server factory for isolated integration tests.
 */
export function createApp(options = {}) {
  const db = options.db || initDatabase(options.dbPath || ':memory:');

  if (options.seed !== false) {
    seedDatabaseIfEmpty(db);
  }

  const distDir = options.distDir || resolve(process.cwd(), 'dist/credit-drive/browser');

  const requestHandler = async (req, res) => {
    // Basic hardening: validate Host header against DNS rebinding
    const host = req.headers['host'];
    if (host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      sendError(res, 403, 'Forbidden host');
      return;
    }

    // Restrictive Origin validation: only allow local origin
    const origin = req.headers['origin'];
    if (origin) {
      if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        sendError(res, 403, 'Forbidden origin');
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Handle static files if request is not an /api route
    if (!pathname.startsWith('/api')) {
      if (existsSync(distDir)) {
        serveStaticFile(req, res, distDir, pathname);
      } else {
        sendError(res, 404, 'Not Found');
      }
      return;
    }

    // Extract Bearer token
    let authUser = null;
    const authHeader = req.headers['authorization'];
    let rawToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
      authUser = authenticateToken(db, rawToken);
    }

    try {
      // 1. Health check
      if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, { ok: true });
        return;
      }

      // 2. Auth: Login
      if (req.method === 'POST' && pathname === '/api/auth/login') {
        const clientIp = req.socket?.remoteAddress || '127.0.0.1';
        if (!checkLoginRateLimit(clientIp)) {
          sendError(res, 429, 'Demasiados intentos fallidos. Intente más tarde.');
          return;
        }

        const body = await parseJsonBody(req);
        const { username, password } = body;
        if (!username || !password) {
          recordFailedLogin(clientIp);
          sendError(res, 400, 'Username and password are required');
          return;
        }

        const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());
        if (!userRow) {
          recordFailedLogin(clientIp);
          sendError(res, 401, 'Credenciales inválidas');
          return;
        }

        if (!userRow.active) {
          recordFailedLogin(clientIp);
          sendError(res, 401, 'Usuario inactivo');
          return;
        }

        if (userRow.storeId) {
          const store = db.prepare('SELECT active FROM stores WHERE id = ?').get(userRow.storeId);
          if (!store || !store.active) {
            recordFailedLogin(clientIp);
            sendError(res, 401, 'Comercio inactivo');
            return;
          }
        }

        if (userRow.clientId) {
          const client = db.prepare('SELECT active FROM clients WHERE id = ?').get(userRow.clientId);
          if (!client || !client.active) {
            recordFailedLogin(clientIp);
            sendError(res, 401, 'Cliente inactivo');
            return;
          }
        }

        const valid = verifyPassword(password, userRow.salt, userRow.passwordHash);
        if (!valid) {
          recordFailedLogin(clientIp);
          sendError(res, 401, 'Credenciales inválidas');
          return;
        }

        resetLoginAttempts(clientIp);

        const token = createSession(db, userRow.id);
        const user = {
          id: userRow.id,
          username: userRow.username,
          name: userRow.name,
          role: userRow.role,
          storeId: userRow.storeId,
          clientId: userRow.clientId,
        };

        sendJson(res, 200, { token, user });
        return;
      }

      // 3. Auth: Logout
      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        if (rawToken) {
          deleteSession(db, rawToken);
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      // Require authentication for all remaining /api endpoints
      if (!authUser) {
        sendError(res, 401, 'No autorizado o token expirado');
        return;
      }

      // 4. Auth: Me
      if (req.method === 'GET' && pathname === '/api/auth/me') {
        sendJson(res, 200, authUser);
        return;
      }

      // 5. Bootstrap
      if (req.method === 'GET' && pathname === '/api/bootstrap') {
        const data = getBootstrapData(db, authUser);
        sendJson(res, 200, data);
        return;
      }

      // 6. Stores (Platform Admin)
      if (req.method === 'POST' && pathname === '/api/stores') {
        const body = await parseJsonBody(req);
        const store = createStore(db, authUser, body);
        sendJson(res, 201, store);
        return;
      }

      const matchStorePatch = /^\/api\/stores\/([a-zA-Z0-9_-]+)$/.exec(pathname);
      if (req.method === 'PATCH' && matchStorePatch) {
        const storeId = matchStorePatch[1];
        const body = await parseJsonBody(req);
        const updated = updateStore(db, authUser, storeId, body);
        sendJson(res, 200, updated);
        return;
      }

      // 7. Products (Store Admin)
      if (req.method === 'POST' && pathname === '/api/products') {
        const body = await parseJsonBody(req);
        const product = createProduct(db, authUser, body);
        sendJson(res, 201, product);
        return;
      }

      const matchProductPatch = /^\/api\/products\/([a-zA-Z0-9_-]+)$/.exec(pathname);
      if (req.method === 'PATCH' && matchProductPatch) {
        const productId = matchProductPatch[1];
        const body = await parseJsonBody(req);
        const updated = updateProduct(db, authUser, productId, body);
        sendJson(res, 200, updated);
        return;
      }

      // 8. Clients (Store Admin)
      if (req.method === 'POST' && pathname === '/api/clients') {
        const body = await parseJsonBody(req);
        const client = createClient(db, authUser, body);
        sendJson(res, 201, client);
        return;
      }

      const matchClientPatch = /^\/api\/clients\/([a-zA-Z0-9_-]+)$/.exec(pathname);
      if (req.method === 'PATCH' && matchClientPatch) {
        const clientId = matchClientPatch[1];
        const body = await parseJsonBody(req);
        const updated = updateClient(db, authUser, clientId, body);
        sendJson(res, 200, updated);
        return;
      }

      // 9. Purchases Preview & Create (Store Admin)
      if (req.method === 'POST' && pathname === '/api/purchases/preview') {
        const body = await parseJsonBody(req);
        const preview = previewPurchase(db, authUser, body);
        sendJson(res, 200, preview);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/purchases') {
        const body = await parseJsonBody(req);
        const purchase = createPurchase(db, authUser, body);
        sendJson(res, 201, purchase);
        return;
      }

      // 10. Statements: Generate (Store Admin)
      if (req.method === 'POST' && pathname === '/api/statements/generate') {
        const body = await parseJsonBody(req);
        const result = generateStatements(db, authUser, body.cutoffDate);
        sendJson(res, 200, result);
        return;
      }

      // 11. Statements: Detail & Export & Pay
      const matchStatementPay = /^\/api\/statements\/([a-zA-Z0-9_-]+)\/pay$/.exec(pathname);
      if (req.method === 'POST' && matchStatementPay) {
        const statementId = matchStatementPay[1];
        const body = await parseJsonBody(req);
        const payment = payStatement(db, authUser, statementId, body);
        sendJson(res, 200, payment);
        return;
      }

      const matchStatementExport = /^\/api\/statements\/([a-zA-Z0-9_-]+)\/export$/.exec(pathname);
      if (req.method === 'GET' && matchStatementExport) {
        const statementId = matchStatementExport[1];
        const asOf = parsedUrl.searchParams.get('asOf');
        const csv = exportStatementCSV(db, authUser, statementId, asOf);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="statement-${statementId}.csv"`);
        res.end(csv);
        return;
      }

      const matchStatementDetail = /^\/api\/statements\/([a-zA-Z0-9_-]+)$/.exec(pathname);
      if (req.method === 'GET' && matchStatementDetail) {
        const statementId = matchStatementDetail[1];
        const asOf = parsedUrl.searchParams.get('asOf');
        const detail = getStatementDetail(db, authUser, statementId, asOf);
        sendJson(res, 200, detail);
        return;
      }

      // Route not found
      sendError(res, 404, 'Endpoint no encontrado');
    } catch (err) {
      const statusCode = err.statusCode || (err.message && err.message.includes('JSON') ? 400 : 500);
      sendError(res, statusCode, err.message || 'Internal server error');
    }
  };

  const server = createHttpServer(requestHandler);

  return {
    server,
    db,
    close: () => {
      try {
        server.close();
      } catch {}
      try {
        db.close();
      } catch {}
    },
  };
}
