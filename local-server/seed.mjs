import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth.mjs';
import { createPurchase } from './domain.mjs';

/**
 * Seeds the database if empty with the required demo accounts, stores,
 * catalogs, clients, and September 2026 sample purchases.
 */
export function seedDatabaseIfEmpty(db) {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount && Number(userCount.cnt) > 0) {
    return false; // Database already seeded
  }

  const now = '2026-09-01T08:00:00.000Z';

  // 1. Platform Admin
  const platformAdminId = randomUUID();
  const { salt: pSalt, passwordHash: pHash } = hashPassword('Barrio2026!');
  db.prepare(`
    INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
    VALUES (?, 'plataforma', ?, ?, 'Administrador de Plataforma (DEMO)', 'PLATFORM_ADMIN', NULL, NULL, 1, ?)
  `).run(platformAdminId, pHash, pSalt, now);

  // 2. Store 1: Bodega Don Pepe
  const store1Id = randomUUID();
  db.prepare(`
    INSERT INTO stores (id, name, businessType, address, taxId, active, createdAt)
    VALUES (?, 'Bodega Don Pepe (DEMO)', 'Abarrotes y Minisuper', 'Jr. Huallaga 345, Lima', '20123456789', 1, ?)
  `).run(store1Id, now);

  const bodegaAdminId = randomUUID();
  const { salt: bSalt, passwordHash: bHash } = hashPassword('Barrio2026!');
  db.prepare(`
    INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
    VALUES (?, 'bodega', ?, ?, 'Admin Bodega Pepe (DEMO)', 'STORE_ADMIN', ?, NULL, 1, ?)
  `).run(bodegaAdminId, bHash, bSalt, store1Id, now);

  // Store 1 Products
  const prodArrozId = randomUUID();
  db.prepare(`
    INSERT INTO products (
      id, storeId, name, description, brand, supplier, unit, imageUrl,
      cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
    ) VALUES (?, ?, 'Arroz Superior Costeño 5kg', 'Arroz extra superior seleccionado', 'Costeño', 'Distribuidora Lima', 'bolsa', 'https://images.unsplash.com/photo-1586201375761-83865001e31c', 2250, 2400, 1, 1, 1, ?)
  `).run(prodArrozId, store1Id, now);

  const prodAceiteId = randomUUID();
  db.prepare(`
    INSERT INTO products (
      id, storeId, name, description, brand, supplier, unit, imageUrl,
      cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
    ) VALUES (?, ?, 'Aceite Vegetal Primor 1L', 'Aceite 100% puro vegetal', 'Primor', 'Distribuidora Lima', 'botella', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5', 950, 1050, 1, 1, 1, ?)
  `).run(prodAceiteId, store1Id, now);

  const prodLecheId = randomUUID();
  db.prepare(`
    INSERT INTO products (
      id, storeId, name, description, brand, supplier, unit, imageUrl,
      cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
    ) VALUES (?, ?, 'Leche Evaporada Gloria Azul Pack 6', 'Leche entera evaporada pack 6 unidades', 'Gloria', 'Gloria S.A.', 'pack', 'https://images.unsplash.com/photo-1550583724-b2692b85b150', 2400, 2600, 1, 1, 1, ?)
  `).run(prodLecheId, store1Id, now);

  // Store 1 Client: Juan Pérez
  const client1Id = randomUUID();
  db.prepare(`
    INSERT INTO clients (
      id, storeId, name, document, phone, email, address,
      currency, creditLimitCents, maxMonths, cutoffDay, cutoffTime, paymentDay,
      rateType, annualRate, capitalizationDays, lateRateType, lateAnnualRate, lateCapitalizationDays,
      active, createdAt
    ) VALUES (?, ?, 'Juan Pérez (DEMO)', '10234567', '987654321', 'juan.perez@demo.local', 'Av. Los Próceres 123, Lima',
      'PEN', 100000, 12, 20, '18:00', 26, 'EFFECTIVE', 24.0, 30, 'EFFECTIVE', 36.0, 30, 1, ?)
  `).run(client1Id, store1Id, now);

  const clienteUserId = randomUUID();
  const { salt: cSalt, passwordHash: cHash } = hashPassword('Barrio2026!');
  db.prepare(`
    INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
    VALUES (?, 'cliente', ?, ?, 'Juan Pérez (DEMO)', 'CUSTOMER', ?, ?, 1, ?)
  `).run(clienteUserId, cHash, cSalt, store1Id, client1Id, now);

  // 3. Store 2: Salón Belleza Glamour (Multi-tenant isolation)
  const store2Id = randomUUID();
  db.prepare(`
    INSERT INTO stores (id, name, businessType, address, taxId, active, createdAt)
    VALUES (?, 'Salón Belleza Glamour (DEMO)', 'Estética y Peluquería', 'Av. Larco 567, Miraflores', '20987654321', 1, ?)
  `).run(store2Id, now);

  const salonAdminId = randomUUID();
  const { salt: sSalt, passwordHash: sHash } = hashPassword('Barrio2026!');
  db.prepare(`
    INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
    VALUES (?, 'salon', ?, ?, 'Admin Salón Glamour (DEMO)', 'STORE_ADMIN', ?, NULL, 1, ?)
  `).run(salonAdminId, sHash, sSalt, store2Id, now);

  const prodCorteId = randomUUID();
  db.prepare(`
    INSERT INTO products (
      id, storeId, name, description, brand, supplier, unit, imageUrl,
      cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
    ) VALUES (?, ?, 'Corte y Lavado Unisex', 'Corte de cabello profesional con lavado', 'Servicio', 'Propio', 'servicio', '', 3500, 4000, 1, 1, 1, ?)
  `).run(prodCorteId, store2Id, now);

  const prodTratamientoId = randomUUID();
  db.prepare(`
    INSERT INTO products (
      id, storeId, name, description, brand, supplier, unit, imageUrl,
      cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
    ) VALUES (?, ?, 'Tratamiento Capilar Keratina', 'Restructuración capilar con keratina brasileña', 'KeraLiss', 'Distribuidora Belleza', 'servicio', '', 12000, 13500, 1, 1, 1, ?)
  `).run(prodTratamientoId, store2Id, now);

  const client2Id = randomUUID();
  db.prepare(`
    INSERT INTO clients (
      id, storeId, name, document, phone, email, address,
      currency, creditLimitCents, maxMonths, cutoffDay, cutoffTime, paymentDay,
      rateType, annualRate, capitalizationDays, lateRateType, lateAnnualRate, lateCapitalizationDays,
      active, createdAt
    ) VALUES (?, ?, 'María Rodríguez (DEMO)', '45678901', '912345678', 'maria.rodriguez@demo.local', 'Calle Berlín 890, Miraflores',
      'PEN', 50000, 6, 15, '18:00', 25, 'NOMINAL', 18.0, 30, 'NOMINAL', 30.0, 30, 1, ?)
  `).run(client2Id, store2Id, now);

  const mariaUserId = randomUUID();
  const { salt: mSalt, passwordHash: mHash } = hashPassword('Barrio2026!');
  db.prepare(`
    INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
    VALUES (?, 'maria', ?, ?, 'María Rodríguez (DEMO)', 'CUSTOMER', ?, ?, 1, ?)
  `).run(mariaUserId, mHash, mSalt, store2Id, client2Id, now);

  // 4. Sample Purchases for Juan Pérez (Store 1)
  const bodegaActor = {
    id: bodegaAdminId,
    username: 'bodega',
    role: 'STORE_ADMIN',
    storeId: store1Id,
  };

  // Purchase 1: Before cutoff, 11-day grace example: 2026-09-15, Corte 20, Pago 26, 3 installments
  createPurchase(db, bodegaActor, {
    clientId: client1Id,
    productId: prodArrozId,
    quantity: 2, // 2 * 24.00 = 48.00 PEN
    mode: 'INSTALLMENTS',
    months: 3,
    purchasedAt: '2026-09-15T10:30',
  });

  // Purchase 2: After cutoff: 2026-09-22, END_OF_MONTH
  createPurchase(db, bodegaActor, {
    clientId: client1Id,
    productId: prodAceiteId,
    quantity: 2, // 2 * 10.50 = 21.00 PEN
    mode: 'END_OF_MONTH',
    months: 1,
    purchasedAt: '2026-09-22T14:00',
  });

  return true;
}
