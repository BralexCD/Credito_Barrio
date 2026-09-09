import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.mjs';

describe('HTTP API - Integration Suite', () => {
  let appInstance;
  let baseUrl;
  let server;
  let db;

  before(async () => {
    appInstance = createApp({
      dbPath: ':memory:',
      seed: true,
    });
    server = appInstance.server;
    db = appInstance.db;

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(() => {
    appInstance.close();
  });

  async function apiRequest(path, { method = 'GET', token, body, headers: customHeaders = {} } = {}) {
    const headers = { ...customHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined),
    });

    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, data, headers: res.headers };
  }

  it('GET /api/health returns 200 { ok: true }', async () => {
    const res = await apiRequest('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, { ok: true });
  });

  it('Auth flow: login, me, logout, and token revocation', async () => {
    // 1. Invalid login
    const badLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'plataforma', password: 'WrongPassword!' },
    });
    assert.equal(badLogin.status, 401);

    // 2. Successful login
    const login = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'plataforma', password: 'Barrio2026!' },
    });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
    assert.equal(login.data.user.username, 'plataforma');
    assert.equal(login.data.user.role, 'PLATFORM_ADMIN');

    const token = login.data.token;

    // 3. GET /api/auth/me
    const me = await apiRequest('/api/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.data.username, 'plataforma');

    // 4. POST /api/auth/logout
    const logout = await apiRequest('/api/auth/logout', { method: 'POST', token });
    assert.equal(logout.status, 200);

    // 5. Subsequent request with revoked token fails with 401
    const afterLogout = await apiRequest('/api/auth/me', { token });
    assert.equal(afterLogout.status, 401);
  });

  it('Bootstrap isolation by role: platform, store admin, customer', async () => {
    const platLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'plataforma', password: 'Barrio2026!' },
    });
    const platBoot = await apiRequest('/api/bootstrap', { token: platLogin.data.token });
    assert.equal(platBoot.status, 200);
    assert.ok(Array.isArray(platBoot.data.stores));
    assert.ok(platBoot.data.stores.length >= 2);
    assert.deepEqual(platBoot.data.products, []);
    assert.deepEqual(platBoot.data.clients, []);

    const bodegaLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    });
    const bodegaBoot = await apiRequest('/api/bootstrap', { token: bodegaLogin.data.token });
    assert.equal(bodegaBoot.status, 200);
    assert.equal(bodegaBoot.data.stores.length, 1);
    assert.equal(bodegaBoot.data.stores[0].name, 'Bodega Don Pepe (DEMO)');
    assert.ok(bodegaBoot.data.products.length >= 3);
    assert.ok(bodegaBoot.data.clients.length >= 1);
    assert.ok(bodegaBoot.data.purchases.length >= 2);

    const clienteLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'cliente', password: 'Barrio2026!' },
    });
    const clienteBoot = await apiRequest('/api/bootstrap', { token: clienteLogin.data.token });
    assert.equal(clienteBoot.status, 200);
    assert.equal(clienteBoot.data.clients.length, 1);
    assert.equal(clienteBoot.data.clients[0].name, 'Juan Pérez (DEMO)');
    assert.deepEqual(clienteBoot.data.audit, []);
  });

  it('Customer cannot mutate domain data (HTTP 403)', async () => {
    const clienteLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'cliente', password: 'Barrio2026!' },
    });
    const token = clienteLogin.data.token;

    const prodRes = await apiRequest('/api/products', {
      method: 'POST',
      token,
      body: { name: 'Hack Prod', cashPrice: 10, creditPrice: 12 },
    });
    assert.equal(prodRes.status, 403);

    const clientRes = await apiRequest('/api/clients', {
      method: 'POST',
      token,
      body: { name: 'Hack Client' },
    });
    assert.equal(clientRes.status, 403);

    const purchRes = await apiRequest('/api/purchases', {
      method: 'POST',
      token,
      body: { quantity: 1 },
    });
    assert.equal(purchRes.status, 403);

    const stmtRes = await apiRequest('/api/statements/generate', {
      method: 'POST',
      token,
      body: { cutoffDate: '2026-09-20' },
    });
    assert.equal(stmtRes.status, 403);
  });

  it('Platform admin cannot view store statements detail (HTTP 403)', async () => {
    const bodegaLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    });
    await apiRequest('/api/statements/generate', {
      method: 'POST',
      token: bodegaLogin.data.token,
      body: { cutoffDate: '2026-10-20' },
    });

    const boot = await apiRequest('/api/bootstrap', { token: bodegaLogin.data.token });
    assert.ok(boot.data.statements.length > 0);
    const statementId = boot.data.statements[0].id;

    const platLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'plataforma', password: 'Barrio2026!' },
    });
    const viewRes = await apiRequest(`/api/statements/${statementId}`, {
      token: platLogin.data.token,
    });
    assert.equal(viewRes.status, 403);
  });

  it('Cross-store access denial (HTTP 403)', async () => {
    const bodegaLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    });
    const boot = await apiRequest('/api/bootstrap', { token: bodegaLogin.data.token });
    const bodegaStatementId = boot.data.statements[0].id;

    const salonLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'salon', password: 'Barrio2026!' },
    });
    const crossRes = await apiRequest(`/api/statements/${bodegaStatementId}`, {
      token: salonLogin.data.token,
    });
    assert.equal(crossRes.status, 403);
  });

  it('Customer cross-access denial (HTTP 403)', async () => {
    const bodegaBoot = await apiRequest('/api/bootstrap', {
      token: (await apiRequest('/api/auth/login', { method: 'POST', body: { username: 'bodega', password: 'Barrio2026!' } })).data.token,
    });
    const juanStatementId = bodegaBoot.data.statements[0].id;

    const mariaLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'maria', password: 'Barrio2026!' },
    });
    const mariaView = await apiRequest(`/api/statements/${juanStatementId}`, {
      token: mariaLogin.data.token,
    });
    assert.equal(mariaView.status, 403);
  });

  it('Inactive user and store access denial (HTTP 401/403)', async () => {
    db.prepare('UPDATE users SET active = 0 WHERE username = ?').run('maria');

    const mariaLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'maria', password: 'Barrio2026!' },
    });
    assert.equal(mariaLogin.status, 401);

    db.prepare('UPDATE users SET active = 1 WHERE username = ?').run('maria');
  });

  it('Statements: asOf validation, payment validations, exact payment, duplicate payment rejection and paid detail freeze', async () => {
    const bodegaToken = (await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    })).data.token;

    const boot = await apiRequest('/api/bootstrap', { token: bodegaToken });
    const statement = boot.data.statements.find((s) => s.status === 'OPEN');
    assert.ok(statement, 'Should find open statement');

    // 1. Reject explicit asOf prior to cutoffDate
    const badAsOf = await apiRequest(`/api/statements/${statement.id}?asOf=2020-01-01`, {
      token: bodegaToken,
    });
    assert.equal(badAsOf.status, 400);

    // 2. Default omitted asOf works safely
    const defaultDetail = await apiRequest(`/api/statements/${statement.id}`, {
      token: bodegaToken,
    });
    assert.equal(defaultDetail.status, 200);
    assert.equal(defaultDetail.data.paidAmount, null);

    // 3. Explicit asOf at statement dueDate
    const detail = await apiRequest(`/api/statements/${statement.id}?asOf=${statement.dueDate}`, {
      token: bodegaToken,
    });
    assert.equal(detail.status, 200);
    const payableTotal = detail.data.payableTotal;
    assert.ok(payableTotal > 0);

    // 4. Reject payment with > 2 decimal places
    const decPay = await apiRequest(`/api/statements/${statement.id}/pay`, {
      method: 'POST',
      token: bodegaToken,
      body: { paidAt: statement.dueDate, amount: payableTotal + 0.005 },
    });
    assert.equal(decPay.status, 400);

    // 5. Reject partial payment
    const partialPay = await apiRequest(`/api/statements/${statement.id}/pay`, {
      method: 'POST',
      token: bodegaToken,
      body: { paidAt: statement.dueDate, amount: payableTotal - 5.00 },
    });
    assert.equal(partialPay.status, 400);

    // 6. Reject excess payment
    const excessPay = await apiRequest(`/api/statements/${statement.id}/pay`, {
      method: 'POST',
      token: bodegaToken,
      body: { paidAt: statement.dueDate, amount: payableTotal + 5.00 },
    });
    assert.equal(excessPay.status, 400);

    // 7. Exact payment succeeds
    const exactPay = await apiRequest(`/api/statements/${statement.id}/pay`, {
      method: 'POST',
      token: bodegaToken,
      body: { paidAt: statement.dueDate, amount: payableTotal },
    });
    assert.equal(exactPay.status, 200);
    assert.equal(exactPay.data.amount, payableTotal);

    // 8. Duplicate payment rejected (409)
    const dupPay = await apiRequest(`/api/statements/${statement.id}/pay`, {
      method: 'POST',
      token: bodegaToken,
      body: { paidAt: statement.dueDate, amount: payableTotal },
    });
    assert.equal(dupPay.status, 409);

    // 9. Paid detail freezes lateDays/lateInterest, payableTotal becomes 0, paidAmount holds settled amount
    const paidDetail = await apiRequest(`/api/statements/${statement.id}?asOf=${statement.dueDate}`, {
      token: bodegaToken,
    });
    assert.equal(paidDetail.status, 200);
    assert.equal(paidDetail.data.status, 'PAID');
    assert.equal(paidDetail.data.payableTotal, 0);
    assert.equal(paidDetail.data.paidAmount, payableTotal);
  });

  it('CSV Export: deterministic asOf and Total Pagado inclusion', async () => {
    const bodegaToken = (await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    })).data.token;

    const boot = await apiRequest('/api/bootstrap', { token: bodegaToken });
    const paidStatement = boot.data.statements.find((s) => s.status === 'PAID');
    assert.ok(paidStatement);

    const csvRes = await apiRequest(`/api/statements/${paidStatement.id}/export?asOf=${paidStatement.dueDate}`, {
      token: bodegaToken,
    });
    assert.equal(csvRes.status, 200);
    assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
    assert.ok(csvRes.data.includes('ESTADO DE CUENTA - CRÉDITO BARRIO'));
    assert.ok(csvRes.data.includes('Total Pagado'));
  });

  it('Hardening: body size cap 64 KiB returns 413, invalid JSON returns 400', async () => {
    const bodegaToken = (await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'bodega', password: 'Barrio2026!' },
    })).data.token;

    // Body larger than 64 KiB
    const largeString = 'a'.repeat(70 * 1024);
    const largeRes = await apiRequest('/api/products', {
      method: 'POST',
      token: bodegaToken,
      body: `{"name":"${largeString}"}`,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(largeRes.status, 413);

    // Non-object JSON (array instead of object)
    const arrayRes = await apiRequest('/api/products', {
      method: 'POST',
      token: bodegaToken,
      body: '[1, 2, 3]',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(arrayRes.status, 400);

    // Malformed JSON
    const malformedRes = await apiRequest('/api/products', {
      method: 'POST',
      token: bodegaToken,
      body: '{ bad json',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(malformedRes.status, 400);
  });
});
