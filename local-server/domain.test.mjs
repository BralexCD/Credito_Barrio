import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { initDatabase } from './db.mjs';
import {
  createStore,
  createProduct,
  updateProduct,
  createClient,
  updateClient,
  previewPurchase,
  createPurchase,
  generateStatements,
  getStatementDetail,
  calculateClientExposure,
} from './domain.mjs';

function createTestEnvironment(dbPath = ':memory:') {
  const db = initDatabase(dbPath);
  const platformAdmin = {
    id: 'admin-1',
    username: 'plataforma',
    role: 'PLATFORM_ADMIN',
  };

  const store = createStore(db, platformAdmin, {
    name: 'Bodega Central',
    businessType: 'Comercio',
    address: 'Av. Test 123',
    taxId: '20100000001',
    adminName: 'Admin Central',
    adminUsername: `admin_${randomUUID().slice(0, 8)}`,
    adminPassword: 'Password123!',
  });

  const storeAdmin = {
    id: 'store-admin-1',
    username: 'storeadmin',
    role: 'STORE_ADMIN',
    storeId: store.id,
  };

  const product = createProduct(db, storeAdmin, {
    name: 'Producto A',
    cashPrice: 10.00,
    creditPrice: 12.00,
    allowEndOfMonth: true,
    allowInstallments: true,
  });

  return { db, platformAdmin, store, storeAdmin, product };
}

describe('Domain - Cutoff TIME Handling (Before vs After Cutoff Time)', () => {
  it('assigns current cycle when purchase is at or before cutoff time', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Tiempo 1',
      document: '11111111',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 500,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36,
    });

    const prev = previewPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-20T17:59',
    });

    assert.equal(prev.firstDueDate, '2026-09-26');
    assert.equal(prev.graceDays, 6);
  });

  it('rolls over to next month cycle when purchase is strictly after cutoff time', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Tiempo 2',
      document: '22222222',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 500,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36,
    });

    const prev = previewPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-20T18:01',
    });

    assert.equal(prev.firstDueDate, '2026-10-26');
    assert.equal(prev.graceDays, 36);
  });
});

describe('Domain - Automated Cutoff Time and Deterministic Clock', () => {
  it('SYSTEM automated closure ONLY closes after stored snapshot cutoff HH:mm', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente AutoCorte',
      document: '77777777',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 500,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36,
    });

    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-15T10:00',
    });

    const systemUser = { role: 'SYSTEM' };

    // 1. Same day at 08:00 -> not closed
    const res08 = generateStatements(db, systemUser, '2026-09-20', '2026-09-20T08:00');
    assert.equal(res08.created, 0);

    // 2. Same day at 18:00 (exact minute purchases still allowed) -> not closed
    const res18 = generateStatements(db, systemUser, '2026-09-20', '2026-09-20T18:00');
    assert.equal(res18.created, 0);

    // 3. Same day at 18:01 -> closed!
    const res1801 = generateStatements(db, systemUser, '2026-09-20', '2026-09-20T18:01');
    assert.equal(res1801.created, 1);

    // 4. Idempotency at 18:05 -> 0 created
    const res1805 = generateStatements(db, systemUser, '2026-09-20', '2026-09-20T18:05');
    assert.equal(res1805.created, 0);

    // Verify audit log has null actor for SYSTEM closure
    const auditRow = db.prepare('SELECT * FROM audit WHERE action = \'STATEMENT_GENERATE_AUTO\'').get();
    assert.ok(auditRow);
    assert.equal(auditRow.actorId, null);
  });
});

describe('Domain - Rate Snapshots and Mixed Rates across Obligation History', () => {
  it('forbids changing client currency if ANY purchases exist', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Moneda',
      document: '66666666',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 500,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24.0,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
    });

    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-15T10:00',
    });

    // Attempting to change currency to USD should throw 400
    assert.throws(() => {
      updateClient(db, storeAdmin, client.id, { currency: 'USD' });
    }, /No se puede cambiar la moneda de un cliente con historial de compras/);
  });

  it('correctly handles mixed late rates when terms change between purchases in same cycle', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Mixto',
      document: '88888888',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 1000,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 0,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36.0,
    });

    // Purchase 1 with late rate 36%
    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 5, // 60.00
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-10T10:00',
    });

    // Update client late rate to 48%
    updateClient(db, storeAdmin, client.id, {
      lateAnnualRate: 48.0,
    });

    // Purchase 2 with late rate 48% in same cycle
    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 5, // 60.00
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-12T10:00',
    });

    // Generate statement
    const gen = generateStatements(db, storeAdmin, '2026-09-20');
    assert.equal(gen.created, 1);

    const statement = db.prepare('SELECT id FROM statements WHERE clientId = ?').get(client.id);
    const detail = getStatementDetail(db, storeAdmin, statement.id, '2026-10-10'); // 14 days overdue

    assert.ok(detail.lateInterest > 0);
    assert.equal(detail.principal, 120.00);
  });
});

describe('Domain - Product Validations and Input Hardening', () => {
  it('rejects invalid, negative, or NaN prices on product creation and update', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    assert.throws(() => {
      createProduct(db, storeAdmin, {
        name: 'Bad Price',
        cashPrice: -5,
        creditPrice: 10,
      });
    }, /must be non-negative/);

    assert.throws(() => {
      createProduct(db, storeAdmin, {
        name: 'NaN Price',
        cashPrice: 'not-a-number',
        creditPrice: 10,
      });
    }, /must be a valid finite number/);

    assert.throws(() => {
      updateProduct(db, storeAdmin, product.id, {
        cashPrice: -10,
      });
    }, /must be non-negative/);

    assert.throws(() => {
      createProduct(db, storeAdmin, {
        name: 'Script Img',
        cashPrice: 10,
        creditPrice: 10,
        imageUrl: 'javascript:alert(1)',
      });
    }, /valid http or https URL/);
  });
});

describe('Domain - Overlimit and Exposure Protection', () => {
  it('enforces credit limit and prevents reduction below current outstanding exposure', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Limite',
      document: '44444444',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 100.00,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 0,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 0,
    });

    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 7,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-10T10:00',
    });

    const exposure = calculateClientExposure(db, client.id);
    assert.equal(exposure, 84.00);

    assert.throws(() => {
      createPurchase(db, storeAdmin, {
        clientId: client.id,
        productId: product.id,
        quantity: 2,
        mode: 'END_OF_MONTH',
        months: 1,
        purchasedAt: '2026-09-11T10:00',
      });
    }, /Límite de crédito excedido/);

    assert.throws(() => {
      updateClient(db, storeAdmin, client.id, {
        creditLimit: 70.00,
      });
    }, /El límite nunca debe poder reducirse por debajo de la exposición vigente/);

    const updated = updateClient(db, storeAdmin, client.id, {
      creditLimit: 90.00,
    });
    assert.equal(updated.creditLimit, 90.00);
    assert.equal(updated.availableCredit, 6.00);
  });
});

describe('Domain - Retroactive Purchases in Closed Cycles & Schedule Collisions', () => {
  it('rejects purchase creation in already closed statement cycles', () => {
    const { db, storeAdmin, product } = createTestEnvironment();

    const client = createClient(db, storeAdmin, {
      name: 'Cliente Retroactivo',
      document: '55555555',
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 1000,
      maxMonths: 6,
      cutoffDay: 20,
      cutoffTime: '18:00',
      paymentDay: 26,
      rateType: 'EFFECTIVE',
      annualRate: 24,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 36,
    });

    createPurchase(db, storeAdmin, {
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      mode: 'END_OF_MONTH',
      months: 1,
      purchasedAt: '2026-09-10T10:00',
    });

    const gen = generateStatements(db, storeAdmin, '2026-09-20');
    assert.equal(gen.created, 1);

    assert.throws(() => {
      createPurchase(db, storeAdmin, {
        clientId: client.id,
        productId: product.id,
        quantity: 1,
        mode: 'END_OF_MONTH',
        months: 1,
        purchasedAt: '2026-09-12T10:00',
      });
    }, /No se permiten compras/);
  });
});

describe('Domain - SQL Injection Safety', () => {
  it('safely handles malicious SQL inputs using bound parameters', () => {
    const { db, storeAdmin } = createTestEnvironment();

    const maliciousName = "Robert'); DROP TABLE users; --";
    const maliciousDoc = "123' OR '1'='1";

    const client = createClient(db, storeAdmin, {
      name: maliciousName,
      document: maliciousDoc,
      username: `user_${randomUUID().slice(0, 8)}`,
      password: 'Password123!',
      currency: 'PEN',
      creditLimit: 500,
      maxMonths: 6,
      cutoffDay: 15,
      cutoffTime: '18:00',
      paymentDay: 25,
      rateType: 'EFFECTIVE',
      annualRate: 20,
      lateRateType: 'EFFECTIVE',
      lateAnnualRate: 30,
    });

    assert.equal(client.name, maliciousName);

    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    assert.ok(Number(usersCount.count) > 0);
  });
});

describe('Domain - Persistence Across Database Restarts', () => {
  it('preserves all schema, records, and calculations across process/connection restarts', () => {
    const tempDbPath = join(tmpdir(), `test_credit_${randomUUID()}.sqlite`);
    try {
      const { db, storeAdmin, product } = createTestEnvironment(tempDbPath);

      const client = createClient(db, storeAdmin, {
        name: 'Cliente Persistencia',
        document: '99999999',
        username: 'clientepresist',
        password: 'Password123!',
        currency: 'PEN',
        creditLimit: 800,
        maxMonths: 6,
        cutoffDay: 20,
        cutoffTime: '18:00',
        paymentDay: 26,
        rateType: 'EFFECTIVE',
        annualRate: 24,
        lateRateType: 'EFFECTIVE',
        lateAnnualRate: 36,
      });

      const purchase = createPurchase(db, storeAdmin, {
        clientId: client.id,
        productId: product.id,
        quantity: 2,
        mode: 'END_OF_MONTH',
        months: 1,
        purchasedAt: '2026-09-14T11:00',
      });

      db.close();

      const reopenedDb = initDatabase(tempDbPath);

      const persistedClient = reopenedDb.prepare('SELECT * FROM clients WHERE id = ?').get(client.id);
      assert.ok(persistedClient);
      assert.equal(persistedClient.name, 'Cliente Persistencia');

      const persistedPurchase = reopenedDb.prepare('SELECT * FROM purchases WHERE id = ?').get(purchase.id);
      assert.ok(persistedPurchase);
      assert.equal(persistedPurchase.principalCents, 2400);

      const obligations = reopenedDb.prepare('SELECT * FROM obligations WHERE purchaseId = ?').all(purchase.id);
      assert.equal(obligations.length, 1);
      assert.equal(obligations[0].capitalCents, 2400);

      reopenedDb.close();
    } finally {
      if (existsSync(tempDbPath)) {
        try { unlinkSync(tempDbPath); } catch {}
      }
    }
  });
});
