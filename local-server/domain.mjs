import { randomUUID } from 'node:crypto';
import { runInTransaction } from './db.mjs';
import { hashPassword } from './auth.mjs';
import {
  parseISODate,
  parseISODateTime,
  days30E360,
  roundMoney,
  toCents,
  fromCents,
  calculateCycleCutoffAndRefDueDate,
  calculateSinglePaymentSchedule,
  calculateInstallmentsSchedule,
  calculateLateFee,
  calculateMixedLateFee,
} from './finance.mjs';

/**
 * Returns current date in Lima time (UTC-5) formatted as YYYY-MM-DD.
 */
export function getLimaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}

/**
 * Returns current date-time in Lima time (UTC-5) formatted as YYYY-MM-DDTHH:mm.
 */
export function getLimaDateTimeString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
}

/**
 * Records an immutable audit event for mutating actions.
 * Null actorId allowed for SYSTEM automated background actions.
 * Never stores passwords or secrets.
 */
export function recordAudit(db, actorId, action, entityId) {
  const id = randomUUID();
  const at = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO audit (id, at, actorId, action, entityId)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, at, actorId || null, action, entityId);
}

/**
 * Calculates current outstanding capital exposure for a client across all unpaid obligations.
 */
export function calculateClientExposure(db, clientId) {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(capitalCents), 0) as totalCents
    FROM obligations
    WHERE clientId = ? AND isPaid = 0
  `);
  const row = stmt.get(clientId);
  return fromCents(Number(row ? row.totalCents : 0));
}

/**
 * Validates a monetary number has at most 2 decimal places and is a safe non-negative number.
 */
export function validateMonetaryAmount(val, fieldName = 'Amount', { allowZero = false } = {}) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    const err = new Error(`${fieldName} must be a valid finite number`);
    err.statusCode = 400;
    throw err;
  }
  if (allowZero ? val < 0 : val <= 0) {
    const err = new Error(`${fieldName} must be ${allowZero ? 'non-negative' : 'greater than zero'}`);
    err.statusCode = 400;
    throw err;
  }
  // Check decimal precision
  const str = val.toString();
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (decimals.length > 2) {
      const err = new Error(`${fieldName} cannot have more than 2 decimal places`);
      err.statusCode = 400;
      throw err;
    }
  }
  toCents(val); // Ensure safe integer in cents
  return val;
}

/**
 * Validates string bounds.
 */
function validateString(val, fieldName, { minLength = 1, maxLength = 100, required = true } = {}) {
  if (val === undefined || val === null) {
    if (required) {
      const err = new Error(`${fieldName} is required`);
      err.statusCode = 400;
      throw err;
    }
    return '';
  }
  if (typeof val !== 'string') {
    const err = new Error(`${fieldName} must be a string`);
    err.statusCode = 400;
    throw err;
  }
  const trimmed = val.trim();
  if (required && trimmed.length < minLength) {
    const err = new Error(`${fieldName} must have at least ${minLength} characters`);
    err.statusCode = 400;
    throw err;
  }
  if (trimmed.length > maxLength) {
    const err = new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    err.statusCode = 400;
    throw err;
  }
  return trimmed;
}

/**
 * Validates product image URL. Rejects arbitrary HTML, javascript: or suspicious protocols.
 */
function validateImageUrl(url) {
  if (url === undefined || url === null || url === '') return '';
  if (typeof url !== 'string') {
    const err = new Error('Image URL must be a string');
    err.statusCode = 400;
    throw err;
  }
  const trimmed = url.trim();
  if (trimmed === '') return '';
  if (trimmed.length > 500) {
    const err = new Error('Image URL exceeds maximum length of 500 characters');
    err.statusCode = 400;
    throw err;
  }
  if (!/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    const err = new Error('Image URL must be a valid http or https URL');
    err.statusCode = 400;
    throw err;
  }
  return trimmed;
}

/**
 * Shared product validator for both create and update.
 */
function validateProductData(data, isUpdate = false, existing = null) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    const err = new Error('Product payload must be an object');
    err.statusCode = 400;
    throw err;
  }

  const name = data.name !== undefined
    ? validateString(data.name, 'Product name', { minLength: 1, maxLength: 150, required: true })
    : (existing ? existing.name : undefined);

  if (!isUpdate && !name) {
    const err = new Error('Product name is required');
    err.statusCode = 400;
    throw err;
  }

  const description = data.description !== undefined
    ? validateString(data.description, 'Description', { minLength: 0, maxLength: 500, required: false })
    : (existing ? existing.description : '');

  const brand = data.brand !== undefined
    ? validateString(data.brand, 'Brand', { minLength: 0, maxLength: 100, required: false })
    : (existing ? existing.brand : '');

  const supplier = data.supplier !== undefined
    ? validateString(data.supplier, 'Supplier', { minLength: 0, maxLength: 100, required: false })
    : (existing ? existing.supplier : '');

  const unit = data.unit !== undefined
    ? validateString(data.unit, 'Unit', { minLength: 1, maxLength: 50, required: false }) || 'und'
    : (existing ? existing.unit : 'und');

  const imageUrl = data.imageUrl !== undefined
    ? validateImageUrl(data.imageUrl)
    : (existing ? existing.imageUrl : '');

  let cashPrice = existing ? fromCents(existing.cashPriceCents) : undefined;
  if (data.cashPrice !== undefined) {
    cashPrice = validateMonetaryAmount(data.cashPrice, 'cashPrice', { allowZero: true });
  } else if (!isUpdate) {
    const err = new Error('cashPrice is required');
    err.statusCode = 400;
    throw err;
  }

  let creditPrice = existing ? fromCents(existing.creditPriceCents) : undefined;
  if (data.creditPrice !== undefined) {
    creditPrice = validateMonetaryAmount(data.creditPrice, 'creditPrice', { allowZero: true });
  } else if (!isUpdate) {
    const err = new Error('creditPrice is required');
    err.statusCode = 400;
    throw err;
  }

  const validateBool = (val, fieldName, defaultVal) => {
    if (val === undefined) return defaultVal;
    if (typeof val !== 'boolean') {
      const err = new Error(`${fieldName} must be a boolean`);
      err.statusCode = 400;
      throw err;
    }
    return val;
  };

  const allowEndOfMonth = validateBool(
    data.allowEndOfMonth,
    'allowEndOfMonth',
    existing ? Boolean(existing.allowEndOfMonth) : true
  );
  const allowInstallments = validateBool(
    data.allowInstallments,
    'allowInstallments',
    existing ? Boolean(existing.allowInstallments) : true
  );
  const active = validateBool(
    data.active,
    'active',
    existing ? Boolean(existing.active) : true
  );

  return {
    name,
    description,
    brand,
    supplier,
    unit,
    imageUrl,
    cashPrice,
    creditPrice,
    allowEndOfMonth,
    allowInstallments,
    active,
  };
}

/**
 * Creates a store and its initial store administrator transactionally.
 * Restricted to PLATFORM_ADMIN.
 */
export function createStore(db, actorUser, data) {
  if (actorUser.role !== 'PLATFORM_ADMIN') {
    const err = new Error('Only platform administrator can create stores');
    err.statusCode = 403;
    throw err;
  }

  const name = validateString(data.name, 'Store name', { minLength: 1, maxLength: 150 });
  const businessType = validateString(data.businessType, 'Business type', { minLength: 1, maxLength: 100 });
  const address = validateString(data.address, 'Address', { minLength: 1, maxLength: 200 });
  const taxId = validateString(data.taxId, 'Tax ID', { minLength: 8, maxLength: 30 });
  const adminName = validateString(data.adminName, 'Admin name', { minLength: 1, maxLength: 150 });
  const adminUsername = validateString(data.adminUsername, 'Admin username', { minLength: 3, maxLength: 50 });
  const adminPassword = data.adminPassword;

  if (!adminPassword || typeof adminPassword !== 'string' || adminPassword.length < 8) {
    const err = new Error('Admin password must have at least 8 characters');
    err.statusCode = 400;
    throw err;
  }

  const { salt, passwordHash } = hashPassword(adminPassword);

  return runInTransaction(db, () => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
    if (existing) {
      const err = new Error(`Username ${adminUsername} is already in use`);
      err.statusCode = 409;
      throw err;
    }

    const storeId = randomUUID();
    const userId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO stores (id, name, businessType, address, taxId, active, createdAt)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(storeId, name, businessType, address, taxId, now);

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
      VALUES (?, ?, ?, ?, ?, 'STORE_ADMIN', ?, NULL, 1, ?)
    `).run(userId, adminUsername, passwordHash, salt, adminName, storeId, now);

    recordAudit(db, actorUser.id, 'STORE_CREATE', storeId);

    return {
      id: storeId,
      name,
      businessType,
      address,
      taxId,
      active: true,
    };
  });
}

/**
 * Updates a store's details and active state.
 * Restricted to PLATFORM_ADMIN.
 */
export function updateStore(db, actorUser, storeId, data) {
  if (actorUser.role !== 'PLATFORM_ADMIN') {
    const err = new Error('Only platform administrator can update stores');
    err.statusCode = 403;
    throw err;
  }

  const existing = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
  if (!existing) {
    const err = new Error('Store not found');
    err.statusCode = 404;
    throw err;
  }

  const name = data.name !== undefined ? validateString(data.name, 'Store name', { minLength: 1, maxLength: 150 }) : existing.name;
  const businessType = data.businessType !== undefined ? validateString(data.businessType, 'Business type', { minLength: 1, maxLength: 100 }) : existing.businessType;
  const address = data.address !== undefined ? validateString(data.address, 'Address', { minLength: 1, maxLength: 200 }) : existing.address;
  const taxId = data.taxId !== undefined ? validateString(data.taxId, 'Tax ID', { minLength: 8, maxLength: 30 }) : existing.taxId;
  const active = data.active !== undefined ? (data.active ? 1 : 0) : existing.active;

  return runInTransaction(db, () => {
    db.prepare(`
      UPDATE stores
      SET name = ?, businessType = ?, address = ?, taxId = ?, active = ?
      WHERE id = ?
    `).run(name, businessType, address, taxId, active, storeId);

    recordAudit(db, actorUser.id, 'STORE_UPDATE', storeId);

    return {
      id: storeId,
      name,
      businessType,
      address,
      taxId,
      active: Boolean(active),
    };
  });
}

/**
 * Creates a product. Restricted to STORE_ADMIN for their own store.
 */
export function createProduct(db, actorUser, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can create products');
    err.statusCode = 403;
    throw err;
  }

  const validated = validateProductData(data, false);
  const id = randomUUID();
  const now = new Date().toISOString();

  return runInTransaction(db, () => {
    db.prepare(`
      INSERT INTO products (
        id, storeId, name, description, brand, supplier, unit, imageUrl,
        cashPriceCents, creditPriceCents, allowEndOfMonth, allowInstallments, active, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      actorUser.storeId,
      validated.name,
      validated.description,
      validated.brand,
      validated.supplier,
      validated.unit,
      validated.imageUrl,
      toCents(validated.cashPrice),
      toCents(validated.creditPrice),
      validated.allowEndOfMonth ? 1 : 0,
      validated.allowInstallments ? 1 : 0,
      validated.active ? 1 : 0,
      now
    );

    recordAudit(db, actorUser.id, 'PRODUCT_CREATE', id);

    return {
      id,
      storeId: actorUser.storeId,
      name: validated.name,
      description: validated.description,
      brand: validated.brand,
      supplier: validated.supplier,
      unit: validated.unit,
      imageUrl: validated.imageUrl,
      cashPrice: roundMoney(validated.cashPrice),
      creditPrice: roundMoney(validated.creditPrice),
      allowEndOfMonth: validated.allowEndOfMonth,
      allowInstallments: validated.allowInstallments,
      active: validated.active,
    };
  });
}

/**
 * Updates a product. Restricted to STORE_ADMIN of the owning store.
 */
export function updateProduct(db, actorUser, productId, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can update products');
    err.statusCode = 403;
    throw err;
  }

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.storeId !== actorUser.storeId) {
    const err = new Error('Cannot update product from another store');
    err.statusCode = 403;
    throw err;
  }

  const validated = validateProductData(data, true, existing);

  return runInTransaction(db, () => {
    db.prepare(`
      UPDATE products SET
        name = ?, description = ?, brand = ?, supplier = ?, unit = ?, imageUrl = ?,
        cashPriceCents = ?, creditPriceCents = ?, allowEndOfMonth = ?, allowInstallments = ?, active = ?
      WHERE id = ?
    `).run(
      validated.name,
      validated.description,
      validated.brand,
      validated.supplier,
      validated.unit,
      validated.imageUrl,
      toCents(validated.cashPrice),
      toCents(validated.creditPrice),
      validated.allowEndOfMonth ? 1 : 0,
      validated.allowInstallments ? 1 : 0,
      validated.active ? 1 : 0,
      productId
    );

    recordAudit(db, actorUser.id, 'PRODUCT_UPDATE', productId);

    return {
      id: productId,
      storeId: existing.storeId,
      name: validated.name,
      description: validated.description,
      brand: validated.brand,
      supplier: validated.supplier,
      unit: validated.unit,
      imageUrl: validated.imageUrl,
      cashPrice: roundMoney(validated.cashPrice),
      creditPrice: roundMoney(validated.creditPrice),
      allowEndOfMonth: validated.allowEndOfMonth,
      allowInstallments: validated.allowInstallments,
      active: validated.active,
    };
  });
}

/**
 * Validates client financial profile fields.
 */
function validateClientFields(data) {
  const currency = data.currency;
  if (currency !== 'PEN' && currency !== 'USD') {
    const err = new Error('Currency must be PEN or USD');
    err.statusCode = 400;
    throw err;
  }

  const creditLimit = validateMonetaryAmount(Number(data.creditLimit), 'creditLimit');

  const maxMonths = Number(data.maxMonths);
  if (!Number.isInteger(maxMonths) || maxMonths < 1 || maxMonths > 60) {
    const err = new Error('maxMonths must be an integer between 1 and 60');
    err.statusCode = 400;
    throw err;
  }

  const cutoffDay = Number(data.cutoffDay);
  if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 28) {
    const err = new Error('cutoffDay must be an integer between 1 and 28');
    err.statusCode = 400;
    throw err;
  }

  const paymentDay = Number(data.paymentDay);
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 28) {
    const err = new Error('paymentDay must be an integer between 1 and 28');
    err.statusCode = 400;
    throw err;
  }

  const cutoffTime = String(data.cutoffTime || '');
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(cutoffTime)) {
    const err = new Error('cutoffTime must be in HH:mm format (00:00 to 23:59)');
    err.statusCode = 400;
    throw err;
  }

  const rateType = data.rateType;
  if (rateType !== 'EFFECTIVE' && rateType !== 'NOMINAL') {
    const err = new Error('rateType must be EFFECTIVE or NOMINAL');
    err.statusCode = 400;
    throw err;
  }

  const annualRate = Number(data.annualRate);
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 10000) {
    const err = new Error('annualRate must be a non-negative finite number (<= 10000%)');
    err.statusCode = 400;
    throw err;
  }

  const capitalizationDays = Number(data.capitalizationDays || 30);
  if (rateType === 'NOMINAL' && ![1, 15, 30, 60, 90, 180, 360].includes(capitalizationDays)) {
    const err = new Error('capitalizationDays must be one of 1, 15, 30, 60, 90, 180, 360');
    err.statusCode = 400;
    throw err;
  }

  const lateRateType = data.lateRateType;
  if (lateRateType !== 'EFFECTIVE' && lateRateType !== 'NOMINAL') {
    const err = new Error('lateRateType must be EFFECTIVE or NOMINAL');
    err.statusCode = 400;
    throw err;
  }

  const lateAnnualRate = Number(data.lateAnnualRate);
  if (!Number.isFinite(lateAnnualRate) || lateAnnualRate < 0 || lateAnnualRate > 10000) {
    const err = new Error('lateAnnualRate must be a non-negative finite number (<= 10000%)');
    err.statusCode = 400;
    throw err;
  }

  const lateCapitalizationDays = Number(data.lateCapitalizationDays || 30);
  if (lateRateType === 'NOMINAL' && ![1, 15, 30, 60, 90, 180, 360].includes(lateCapitalizationDays)) {
    const err = new Error('lateCapitalizationDays must be one of 1, 15, 30, 60, 90, 180, 360');
    err.statusCode = 400;
    throw err;
  }

  return {
    currency,
    creditLimit,
    maxMonths,
    cutoffDay,
    cutoffTime,
    paymentDay,
    rateType,
    annualRate,
    capitalizationDays,
    lateRateType,
    lateAnnualRate,
    lateCapitalizationDays,
  };
}

/**
 * Creates a client and customer login user transactionally.
 * Restricted to STORE_ADMIN.
 */
export function createClient(db, actorUser, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can create clients');
    err.statusCode = 403;
    throw err;
  }

  const name = validateString(data.name, 'Client name', { minLength: 1, maxLength: 150 });
  const document = validateString(data.document, 'Document', { minLength: 1, maxLength: 30 });
  const phone = validateString(data.phone, 'Phone', { minLength: 0, maxLength: 30, required: false });
  const email = validateString(data.email, 'Email', { minLength: 0, maxLength: 100, required: false });
  const address = validateString(data.address, 'Address', { minLength: 0, maxLength: 200, required: false });
  const username = validateString(data.username, 'Username', { minLength: 3, maxLength: 50 });
  const password = data.password;

  if (!password || typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must have at least 8 characters');
    err.statusCode = 400;
    throw err;
  }

  const validated = validateClientFields(data);
  const { salt, passwordHash } = hashPassword(password);
  const active = typeof data.active === 'boolean' ? data.active : true;

  return runInTransaction(db, () => {
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      const err = new Error(`Username ${username} is already in use`);
      err.statusCode = 409;
      throw err;
    }

    const clientId = randomUUID();
    const userId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO clients (
        id, storeId, name, document, phone, email, address,
        currency, creditLimitCents, maxMonths, cutoffDay, cutoffTime, paymentDay,
        rateType, annualRate, capitalizationDays, lateRateType, lateAnnualRate, lateCapitalizationDays,
        active, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clientId,
      actorUser.storeId,
      name,
      document,
      phone,
      email,
      address,
      validated.currency,
      toCents(validated.creditLimit),
      validated.maxMonths,
      validated.cutoffDay,
      validated.cutoffTime,
      validated.paymentDay,
      validated.rateType,
      validated.annualRate,
      validated.capitalizationDays,
      validated.lateRateType,
      validated.lateAnnualRate,
      validated.lateCapitalizationDays,
      active ? 1 : 0,
      now
    );

    db.prepare(`
      INSERT INTO users (id, username, passwordHash, salt, name, role, storeId, clientId, active, createdAt)
      VALUES (?, ?, ?, ?, ?, 'CUSTOMER', ?, ?, ?, ?)
    `).run(
      userId,
      username,
      passwordHash,
      salt,
      name,
      actorUser.storeId,
      clientId,
      active ? 1 : 0,
      now
    );

    recordAudit(db, actorUser.id, 'CLIENT_CREATE', clientId);

    return {
      id: clientId,
      storeId: actorUser.storeId,
      name,
      document,
      phone,
      email,
      address,
      currency: validated.currency,
      creditLimit: roundMoney(validated.creditLimit),
      maxMonths: validated.maxMonths,
      cutoffDay: validated.cutoffDay,
      cutoffTime: validated.cutoffTime,
      paymentDay: validated.paymentDay,
      rateType: validated.rateType,
      annualRate: validated.annualRate,
      capitalizationDays: validated.capitalizationDays,
      lateRateType: validated.lateRateType,
      lateAnnualRate: validated.lateAnnualRate,
      lateCapitalizationDays: validated.lateCapitalizationDays,
      active: Boolean(active),
      outstandingCapital: 0,
      availableCredit: roundMoney(validated.creditLimit),
    };
  });
}

/**
 * Updates client details.
 * Prevents changing currency if ANY purchases/history exists.
 * Prevents reducing creditLimit below current outstanding exposure.
 * Restricted to STORE_ADMIN.
 */
export function updateClient(db, actorUser, clientId, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can update clients');
    err.statusCode = 403;
    throw err;
  }

  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
  if (!existing) {
    const err = new Error('Client not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.storeId !== actorUser.storeId) {
    const err = new Error('Cannot update client from another store');
    err.statusCode = 403;
    throw err;
  }

  // Guard: forbid changing currency if client has ANY purchases in history
  if (data.currency !== undefined && data.currency !== existing.currency) {
    const purchaseCount = db.prepare('SELECT COUNT(*) as cnt FROM purchases WHERE clientId = ?').get(clientId);
    if (purchaseCount && Number(purchaseCount.cnt) > 0) {
      const err = new Error('No se puede cambiar la moneda de un cliente con historial de compras. Cree una nueva cuenta para otra moneda.');
      err.statusCode = 400;
      throw err;
    }
  }

  const exposure = calculateClientExposure(db, clientId);

  const merged = {
    currency: data.currency !== undefined ? data.currency : existing.currency,
    creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : fromCents(existing.creditLimitCents),
    maxMonths: data.maxMonths !== undefined ? Number(data.maxMonths) : existing.maxMonths,
    cutoffDay: data.cutoffDay !== undefined ? Number(data.cutoffDay) : existing.cutoffDay,
    cutoffTime: data.cutoffTime !== undefined ? data.cutoffTime : existing.cutoffTime,
    paymentDay: data.paymentDay !== undefined ? Number(data.paymentDay) : existing.paymentDay,
    rateType: data.rateType !== undefined ? data.rateType : existing.rateType,
    annualRate: data.annualRate !== undefined ? Number(data.annualRate) : existing.annualRate,
    capitalizationDays: data.capitalizationDays !== undefined ? Number(data.capitalizationDays) : existing.capitalizationDays,
    lateRateType: data.lateRateType !== undefined ? data.lateRateType : existing.lateRateType,
    lateAnnualRate: data.lateAnnualRate !== undefined ? Number(data.lateAnnualRate) : existing.lateAnnualRate,
    lateCapitalizationDays: data.lateCapitalizationDays !== undefined ? Number(data.lateCapitalizationDays) : existing.lateCapitalizationDays,
  };

  const validated = validateClientFields(merged);

  // Enforce rule: credit limit cannot be reduced below outstanding exposure
  if (validated.creditLimit < exposure) {
    const err = new Error('El límite nunca debe poder reducirse por debajo de la exposición vigente');
    err.statusCode = 400;
    throw err;
  }

  const name = data.name !== undefined ? validateString(data.name, 'Client name', { minLength: 1, maxLength: 150 }) : existing.name;
  const document = data.document !== undefined ? validateString(data.document, 'Document', { minLength: 1, maxLength: 30 }) : existing.document;
  const phone = data.phone !== undefined ? validateString(data.phone, 'Phone', { minLength: 0, maxLength: 30, required: false }) : existing.phone;
  const email = data.email !== undefined ? validateString(data.email, 'Email', { minLength: 0, maxLength: 100, required: false }) : existing.email;
  const address = data.address !== undefined ? validateString(data.address, 'Address', { minLength: 0, maxLength: 200, required: false }) : existing.address;
  const active = typeof data.active === 'boolean' ? (data.active ? 1 : 0) : existing.active;

  return runInTransaction(db, () => {
    db.prepare(`
      UPDATE clients SET
        name = ?, document = ?, phone = ?, email = ?, address = ?,
        currency = ?, creditLimitCents = ?, maxMonths = ?, cutoffDay = ?, cutoffTime = ?, paymentDay = ?,
        rateType = ?, annualRate = ?, capitalizationDays = ?, lateRateType = ?, lateAnnualRate = ?, lateCapitalizationDays = ?,
        active = ?
      WHERE id = ?
    `).run(
      name, document, phone, email, address,
      validated.currency, toCents(validated.creditLimit), validated.maxMonths, validated.cutoffDay, validated.cutoffTime, validated.paymentDay,
      validated.rateType, validated.annualRate, validated.capitalizationDays, validated.lateRateType, validated.lateAnnualRate, validated.lateCapitalizationDays,
      active, clientId
    );

    if (data.active !== undefined) {
      db.prepare('UPDATE users SET active = ? WHERE clientId = ?').run(active, clientId);
    }

    recordAudit(db, actorUser.id, 'CLIENT_UPDATE', clientId);

    const availableCredit = Math.max(0, roundMoney(validated.creditLimit - exposure));

    return {
      id: clientId,
      storeId: existing.storeId,
      name,
      document,
      phone,
      email,
      address,
      currency: validated.currency,
      creditLimit: roundMoney(validated.creditLimit),
      maxMonths: validated.maxMonths,
      cutoffDay: validated.cutoffDay,
      cutoffTime: validated.cutoffTime,
      paymentDay: validated.paymentDay,
      rateType: validated.rateType,
      annualRate: validated.annualRate,
      capitalizationDays: validated.capitalizationDays,
      lateRateType: validated.lateRateType,
      lateAnnualRate: validated.lateAnnualRate,
      lateCapitalizationDays: validated.lateCapitalizationDays,
      active: Boolean(active),
      outstandingCapital: exposure,
      availableCredit,
    };
  });
}

/**
 * Validates purchase inputs and computes financial terms.
 * Used by both /api/purchases/preview and /api/purchases.
 */
function preparePurchaseData(db, actorUser, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can create purchases');
    err.statusCode = 403;
    throw err;
  }

  const { clientId, productId, quantity, mode, months, purchasedAt } = data;
  if (!clientId || !productId || !purchasedAt) {
    const err = new Error('clientId, productId, and purchasedAt are required');
    err.statusCode = 400;
    throw err;
  }

  // Strict Gregorian date/time check without timezone suffix
  parseISODateTime(purchasedAt);

  const numQty = Number(quantity);
  if (!Number.isFinite(numQty) || numQty <= 0) {
    const err = new Error('Quantity must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  if (mode !== 'END_OF_MONTH' && mode !== 'INSTALLMENTS') {
    const err = new Error('mode must be END_OF_MONTH or INSTALLMENTS');
    err.statusCode = 400;
    throw err;
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
  if (!client) {
    const err = new Error('Client not found');
    err.statusCode = 404;
    throw err;
  }
  if (client.storeId !== actorUser.storeId) {
    const err = new Error('Client belongs to another store');
    err.statusCode = 403;
    throw err;
  }
  if (!client.active) {
    const err = new Error('Client is inactive and cannot make purchases');
    err.statusCode = 400;
    throw err;
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  if (product.storeId !== actorUser.storeId) {
    const err = new Error('Product belongs to another store');
    err.statusCode = 403;
    throw err;
  }
  if (!product.active) {
    const err = new Error('Product is inactive');
    err.statusCode = 400;
    throw err;
  }

  if (mode === 'END_OF_MONTH' && !product.allowEndOfMonth) {
    const err = new Error('Product does not allow END_OF_MONTH mode');
    err.statusCode = 400;
    throw err;
  }
  if (mode === 'INSTALLMENTS' && !product.allowInstallments) {
    const err = new Error('Product does not allow INSTALLMENTS mode');
    err.statusCode = 400;
    throw err;
  }

  let numMonths = 1;
  if (mode === 'INSTALLMENTS') {
    numMonths = Number(months);
    if (!Number.isInteger(numMonths) || numMonths < 1 || numMonths > client.maxMonths) {
      const err = new Error(`months must be between 1 and ${client.maxMonths}`);
      err.statusCode = 400;
      throw err;
    }
  }

  const creditPrice = fromCents(product.creditPriceCents);
  const principal = roundMoney(creditPrice * numQty);

  let calculation;
  if (mode === 'END_OF_MONTH') {
    calculation = calculateSinglePaymentSchedule({
      principal,
      purchasedAt,
      cutoffDay: client.cutoffDay,
      cutoffTime: client.cutoffTime,
      paymentDay: client.paymentDay,
      rateType: client.rateType,
      annualRate: client.annualRate,
      capitalizationDays: client.capitalizationDays,
    });
  } else {
    calculation = calculateInstallmentsSchedule({
      principal,
      purchasedAt,
      cutoffDay: client.cutoffDay,
      cutoffTime: client.cutoffTime,
      paymentDay: client.paymentDay,
      rateType: client.rateType,
      annualRate: client.annualRate,
      capitalizationDays: client.capitalizationDays,
      months: numMonths,
    });
  }

  // Check retroactive collision: prevent purchase if ANY proposed schedule item hits an existing statement cycle
  for (const item of calculation.schedule) {
    const existingStatement = db.prepare(`
      SELECT id FROM statements
      WHERE clientId = ? AND cutoffDate = ? AND dueDate = ?
    `).get(client.id, item.cutoffDate, item.dueDate);
    if (existingStatement) {
      const err = new Error(`No se permiten compras con obligaciones en ciclos ya facturados o cerrados (Corte: ${item.cutoffDate}, Vence: ${item.dueDate})`);
      err.statusCode = 400;
      throw err;
    }
  }

  // Check prior cycle cutoff already closed
  const { cutoffDate: cycleCutoffDate } = calculateCycleCutoffAndRefDueDate(
    purchasedAt,
    client.cutoffDay,
    client.cutoffTime,
    client.paymentDay
  );

  const closedPrior = db.prepare(`
    SELECT id FROM statements
    WHERE clientId = ? AND cutoffDate >= ?
    LIMIT 1
  `).get(client.id, cycleCutoffDate);

  if (closedPrior) {
    const err = new Error('No se permiten compras retroactivas en ciclos ya cerrados');
    err.statusCode = 400;
    throw err;
  }

  const exposure = calculateClientExposure(db, clientId);
  const clientLimit = fromCents(client.creditLimitCents);
  if (roundMoney(exposure + calculation.capitalizedPrincipal) > clientLimit) {
    const err = new Error('Límite de crédito excedido');
    err.statusCode = 400;
    throw err;
  }

  return {
    client,
    product,
    numQty,
    mode,
    numMonths,
    purchasedAt,
    principal,
    calculation,
  };
}

/**
 * Previews a purchase calculation without persisting.
 */
export function previewPurchase(db, actorUser, data) {
  const prepared = preparePurchaseData(db, actorUser, data);
  const calc = prepared.calculation;
  return {
    principal: calc.principal,
    graceDays: calc.graceDays,
    capitalizedPrincipal: calc.capitalizedPrincipal,
    firstDueDate: calc.firstDueDate,
    schedule: calc.schedule.map((item) => ({
      number: item.number,
      dueDate: item.dueDate,
      capital: item.capital,
      interest: item.interest,
      total: item.total,
    })),
  };
}

/**
 * Creates and persists a purchase with historical rate snapshots and obligations.
 */
export function createPurchase(db, actorUser, data) {
  const prepared = preparePurchaseData(db, actorUser, data);
  const { client, product, numQty, mode, numMonths, purchasedAt, principal, calculation } = prepared;

  const purchaseId = randomUUID();
  const now = new Date().toISOString();

  return runInTransaction(db, () => {
    db.prepare(`
      INSERT INTO purchases (
        id, storeId, clientId, productId, productName, quantity, mode, months,
        purchasedAt, principalCents, graceDays, capitalizedPrincipalCents, firstDueDate,
        currency, snapshotCutoffTime,
        snapshotRateType, snapshotAnnualRate, snapshotCapitalizationDays,
        snapshotLateRateType, snapshotLateAnnualRate, snapshotLateCapitalizationDays,
        scheduleJson, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      purchaseId,
      actorUser.storeId,
      client.id,
      product.id,
      product.name,
      numQty,
      mode,
      numMonths,
      purchasedAt,
      toCents(principal),
      calculation.graceDays,
      toCents(calculation.capitalizedPrincipal),
      calculation.firstDueDate,
      client.currency,
      client.cutoffTime,
      client.rateType,
      client.annualRate,
      client.capitalizationDays,
      client.lateRateType,
      client.lateAnnualRate,
      client.lateCapitalizationDays,
      JSON.stringify(calculation.schedule),
      now
    );

    const insertObligation = db.prepare(`
      INSERT INTO obligations (
        id, purchaseId, storeId, clientId, installmentNumber,
        cutoffDate, dueDate, capitalCents, interestCents, totalCents,
        currency, snapshotCutoffTime, snapshotLateRateType, snapshotLateAnnualRate, snapshotLateCapitalizationDays,
        statementId, isPaid, paidAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, NULL, ?)
    `);

    for (const item of calculation.schedule) {
      const obligationId = randomUUID();
      insertObligation.run(
        obligationId,
        purchaseId,
        actorUser.storeId,
        client.id,
        item.number,
        item.cutoffDate,
        item.dueDate,
        toCents(item.capital),
        toCents(item.interest),
        toCents(item.total),
        client.currency,
        client.cutoffTime,
        client.lateRateType,
        client.lateAnnualRate,
        client.lateCapitalizationDays,
        now
      );
    }

    recordAudit(db, actorUser.id, 'PURCHASE_CREATE', purchaseId);

    return {
      id: purchaseId,
      storeId: actorUser.storeId,
      clientId: client.id,
      productId: product.id,
      productName: product.name,
      quantity: numQty,
      mode,
      months: numMonths,
      purchasedAt,
      principal,
      graceDays: calculation.graceDays,
      capitalizedPrincipal: calculation.capitalizedPrincipal,
      firstDueDate: calculation.firstDueDate,
      schedule: calculation.schedule.map((item) => ({
        number: item.number,
        dueDate: item.dueDate,
        capital: item.capital,
        interest: item.interest,
        total: item.total,
      })),
    };
  });
}

/**
 * Idempotently generates pending statements.
 * For SYSTEM auto-closure: passes currentLimaDateTime and ONLY closes if currentLimaDateTime > cutoffDateTHH:mm.
 * For manual STORE_ADMIN: cutoffDate acts as educational end-of-day simulation.
 * Uses historic currency and preserves separate obligation rate snapshots.
 */
export function generateStatements(db, actorUser, cutoffDate, currentLimaDateTime = null) {
  if (actorUser && actorUser.role !== 'STORE_ADMIN' && actorUser.role !== 'SYSTEM') {
    const err = new Error('Only store administrators can generate statements');
    err.statusCode = 403;
    throw err;
  }

  if (!cutoffDate || typeof cutoffDate !== 'string') {
    cutoffDate = getLimaDateString();
  } else {
    parseISODate(cutoffDate);
  }

  const isSystem = actorUser && actorUser.role === 'SYSTEM';
  const refDateTime = currentLimaDateTime || getLimaDateTimeString();

  const storeFilter = actorUser && actorUser.storeId ? actorUser.storeId : null;

  return runInTransaction(db, () => {
    let query = `
      SELECT o.*
      FROM obligations o
      WHERE o.statementId IS NULL AND o.isPaid = 0 AND o.cutoffDate <= ?
    `;
    const params = [cutoffDate];
    if (storeFilter) {
      query += ' AND o.storeId = ?';
      params.push(storeFilter);
    }
    query += ' ORDER BY o.clientId, o.cutoffDate, o.dueDate, o.installmentNumber';

    const candidates = db.prepare(query).all(...params);
    if (candidates.length === 0) {
      return { created: 0 };
    }

    // Filter obligations if automated closure: only if refDateTime > cutoffDateTHH:mm
    const eligibleObligations = candidates.filter((ob) => {
      if (!isSystem) return true; // Manual simulation generates all <= cutoffDate
      const cutoffMoment = `${ob.cutoffDate}T${ob.snapshotCutoffTime || '18:00'}`;
      return refDateTime > cutoffMoment;
    });

    if (eligibleObligations.length === 0) {
      return { created: 0 };
    }

    // Group by clientId + cutoffDate + dueDate
    const groups = new Map();
    for (const ob of eligibleObligations) {
      const key = `${ob.clientId}::${ob.cutoffDate}::${ob.dueDate}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(ob);
    }

    let createdCount = 0;
    const now = new Date().toISOString();

    for (const [key, items] of groups.entries()) {
      const first = items[0];

      // Check if statement already exists (idempotency). DO NOT attach or corrupt state!
      const existing = db.prepare(`
        SELECT id FROM statements
        WHERE clientId = ? AND cutoffDate = ? AND dueDate = ?
      `).get(first.clientId, first.cutoffDate, first.dueDate);

      if (existing) {
        // Never attach new obligations to already sealed or paid statements
        continue;
      }

      const totalCapitalCents = items.reduce((acc, it) => acc + Number(it.capitalCents), 0);
      const totalInterestCents = items.reduce((acc, it) => acc + Number(it.interestCents), 0);
      const totalCents = totalCapitalCents + totalInterestCents;

      const statementId = randomUUID();

      db.prepare(`
        INSERT INTO statements (
          id, storeId, clientId, cutoffDate, dueDate, currency, status,
          principalCents, interestCents, totalCents, paidAt, paidAmountCents,
          snapshotLateRateType, snapshotLateAnnualRate, snapshotLateCapitalizationDays,
          createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
      `).run(
        statementId,
        first.storeId,
        first.clientId,
        first.cutoffDate,
        first.dueDate,
        first.currency,
        totalCapitalCents,
        totalInterestCents,
        totalCents,
        first.snapshotLateRateType,
        first.snapshotLateAnnualRate,
        first.snapshotLateCapitalizationDays,
        now
      );

      const updateOb = db.prepare('UPDATE obligations SET statementId = ? WHERE id = ?');
      for (const it of items) {
        updateOb.run(statementId, it.id);
      }

      recordAudit(
        db,
        isSystem ? null : (actorUser ? actorUser.id : null),
        isSystem ? 'STATEMENT_GENERATE_AUTO' : 'STATEMENT_GENERATE',
        statementId
      );

      createdCount++;
    }

    return { created: createdCount };
  });
}

/**
 * Returns statement details including mixed late interest and payment breakdown as of date.
 * Enforces role and isolation permissions.
 * Defaults omitted asOf on open statements to max(today, cutoffDate).
 */
export function getStatementDetail(db, actorUser, statementId, asOf) {
  const statement = db.prepare('SELECT * FROM statements WHERE id = ?').get(statementId);
  if (!statement) {
    const err = new Error('Statement not found');
    err.statusCode = 404;
    throw err;
  }

  if (actorUser.role === 'PLATFORM_ADMIN') {
    const err = new Error('Platform administrator cannot view private store statements');
    err.statusCode = 403;
    throw err;
  }
  if (actorUser.role === 'STORE_ADMIN' && statement.storeId !== actorUser.storeId) {
    const err = new Error('Cannot view statement from another store');
    err.statusCode = 403;
    throw err;
  }
  if (actorUser.role === 'CUSTOMER' && statement.clientId !== actorUser.clientId) {
    const err = new Error('Cannot view another customer statement');
    err.statusCode = 403;
    throw err;
  }

  const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(statement.clientId);
  const clientName = client ? client.name : '';

  // Determine effective asOf date
  let effectiveAsOf;
  if (!asOf) {
    const today = getLimaDateString();
    effectiveAsOf = today > statement.cutoffDate ? today : statement.cutoffDate;
  } else {
    parseISODate(asOf);
    if (asOf < statement.cutoffDate) {
      const err = new Error('asOf date cannot be prior to statement cutoff date');
      err.statusCode = 400;
      throw err;
    }
    effectiveAsOf = asOf;
  }

  // Fetch obligations belonging to this statement
  const obligations = db.prepare(`
    SELECT o.*, p.productName, p.purchasedAt
    FROM obligations o
    JOIN purchases p ON o.purchaseId = p.id
    WHERE o.statementId = ?
    ORDER BY p.purchasedAt ASC, o.installmentNumber ASC
  `).all(statementId);

  let lateDays = 0;
  let lateInterest = 0;
  let payableTotal = 0;
  let paidAmount = null;

  if (statement.status === 'PAID') {
    // Freeze lateDays and lateInterest to payment date
    const payment = db.prepare('SELECT * FROM payments WHERE statementId = ?').get(statement.id);
    if (payment) {
      lateInterest = fromCents(payment.lateInterestCents);
      paidAmount = fromCents(payment.amountCents);
      lateDays = Math.max(0, days30E360(statement.dueDate, payment.paidAt));
    } else if (statement.paidAmountCents !== null) {
      paidAmount = fromCents(statement.paidAmountCents);
      lateDays = statement.paidAt ? Math.max(0, days30E360(statement.dueDate, statement.paidAt)) : 0;
    }
    payableTotal = 0; // UI knows payableTotal is 0 when settled
  } else {
    // Calculate mixed late rates across obligation snapshots
    const lateCalc = calculateMixedLateFee({
      items: obligations,
      asOf: effectiveAsOf,
      statementTotal: fromCents(statement.totalCents),
    });
    lateDays = lateCalc.lateDays;
    lateInterest = lateCalc.lateInterest;
    payableTotal = lateCalc.payableTotal;
  }

  const items = obligations.map((row) => ({
    purchaseId: row.purchaseId,
    productName: row.productName,
    purchasedAt: row.purchasedAt,
    installmentNumber: row.installmentNumber,
    capital: fromCents(row.capitalCents),
    interest: fromCents(row.interestCents),
    total: fromCents(row.totalCents),
  }));

  const principal = fromCents(statement.principalCents);
  const interest = fromCents(statement.interestCents);
  const total = fromCents(statement.totalCents);

  return {
    id: statement.id,
    clientId: statement.clientId,
    clientName,
    currency: statement.currency,
    cutoffDate: statement.cutoffDate,
    dueDate: statement.dueDate,
    status: statement.status,
    principal,
    interest,
    total,
    paidAt: statement.paidAt,
    paidAmount,
    items,
    lateDays,
    lateInterest,
    payableTotal,
    allocation: {
      lateInterest,
      interest,
      capital: principal,
    },
  };
}

/**
 * Registers atomic payment of a statement.
 * Rejects partial payments, excess amounts, >2 decimal places, or duplicate payments.
 * Restricted to STORE_ADMIN.
 */
export function payStatement(db, actorUser, statementId, data) {
  if (actorUser.role !== 'STORE_ADMIN' || !actorUser.storeId) {
    const err = new Error('Only store administrators can record payments');
    err.statusCode = 403;
    throw err;
  }

  const { paidAt, amount } = data;
  if (!paidAt || amount === undefined || amount === null) {
    const err = new Error('paidAt and amount are required');
    err.statusCode = 400;
    throw err;
  }

  parseISODate(paidAt);
  const numAmount = validateMonetaryAmount(amount, 'Payment amount');

  return runInTransaction(db, () => {
    const statement = db.prepare('SELECT * FROM statements WHERE id = ?').get(statementId);
    if (!statement) {
      const err = new Error('Statement not found');
      err.statusCode = 404;
      throw err;
    }

    if (statement.storeId !== actorUser.storeId) {
      const err = new Error('Cannot pay statement from another store');
      err.statusCode = 403;
      throw err;
    }

    if (statement.status === 'PAID') {
      const err = new Error('Statement is already paid');
      err.statusCode = 409;
      throw err;
    }

    if (paidAt < statement.cutoffDate) {
      const err = new Error('Payment date cannot be prior to statement cutoff date');
      err.statusCode = 400;
      throw err;
    }

    const obligations = db.prepare('SELECT * FROM obligations WHERE statementId = ?').all(statementId);
    const lateCalc = calculateMixedLateFee({
      items: obligations,
      asOf: paidAt,
      statementTotal: fromCents(statement.totalCents),
    });

    if (numAmount !== lateCalc.payableTotal) {
      const err = new Error(`Payment amount must exactly equal total payable amount: ${lateCalc.payableTotal}`);
      err.statusCode = 400;
      throw err;
    }

    const lateInterest = lateCalc.lateInterest;
    const interest = fromCents(statement.interestCents);
    const capital = fromCents(statement.principalCents);

    // Mark statement paid and record paidAmount
    db.prepare(`
      UPDATE statements
      SET status = 'PAID', paidAt = ?, paidAmountCents = ?
      WHERE id = ?
    `).run(paidAt, toCents(numAmount), statement.id);

    db.prepare('UPDATE obligations SET isPaid = 1, paidAt = ? WHERE statementId = ?').run(paidAt, statement.id);

    const paymentId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payments (
        id, storeId, statementId, clientId, paidAt,
        amountCents, lateInterestCents, interestCents, capitalCents, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      statement.storeId,
      statement.id,
      statement.clientId,
      paidAt,
      toCents(numAmount),
      toCents(lateInterest),
      statement.interestCents,
      statement.principalCents,
      now
    );

    recordAudit(db, actorUser.id, 'STATEMENT_PAY', statement.id);

    return {
      id: paymentId,
      statementId: statement.id,
      clientId: statement.clientId,
      paidAt,
      amount: numAmount,
      lateInterest,
      interest,
      capital,
    };
  });
}

/**
 * Sanitizes CSV cell to prevent formula injection attacks.
 * Prepends single quote if field begins with =, +, -, @, \t, or \r.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = "'" + str;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports statement details as UTF-8 CSV with neutral formula injection protection.
 * Includes paidAmount / Total Pagado.
 */
export function exportStatementCSV(db, actorUser, statementId, asOf) {
  const detail = getStatementDetail(db, actorUser, statementId, asOf);

  const lines = [];
  lines.push(`${sanitizeCsvCell('ESTADO DE CUENTA - CRÉDITO BARRIO')}`);
  lines.push(`${sanitizeCsvCell('ID Estado')},${sanitizeCsvCell(detail.id)}`);
  lines.push(`${sanitizeCsvCell('Cliente')},${sanitizeCsvCell(detail.clientName)}`);
  lines.push(`${sanitizeCsvCell('Moneda')},${sanitizeCsvCell(detail.currency)}`);
  lines.push(`${sanitizeCsvCell('Fecha Corte')},${sanitizeCsvCell(detail.cutoffDate)}`);
  lines.push(`${sanitizeCsvCell('Fecha Vencimiento')},${sanitizeCsvCell(detail.dueDate)}`);
  lines.push(`${sanitizeCsvCell('Estado')},${sanitizeCsvCell(detail.status)}`);
  lines.push(`${sanitizeCsvCell('Fecha Pago')},${sanitizeCsvCell(detail.paidAt || 'PENDIENTE')}`);
  lines.push(`${sanitizeCsvCell('Total Pagado')},${sanitizeCsvCell(detail.paidAmount !== null ? detail.paidAmount.toFixed(2) : '0.00')}`);
  lines.push('');
  lines.push(`${sanitizeCsvCell('DETALLE DE OBLIGACIONES')}`);
  lines.push([
    sanitizeCsvCell('Nro Cuota'),
    sanitizeCsvCell('Producto'),
    sanitizeCsvCell('Fecha Compra'),
    sanitizeCsvCell('Capital'),
    sanitizeCsvCell('Interés'),
    sanitizeCsvCell('Total'),
  ].join(','));

  for (const it of detail.items) {
    lines.push([
      sanitizeCsvCell(it.installmentNumber),
      sanitizeCsvCell(it.productName),
      sanitizeCsvCell(it.purchasedAt),
      sanitizeCsvCell(it.capital.toFixed(2)),
      sanitizeCsvCell(it.interest.toFixed(2)),
      sanitizeCsvCell(it.total.toFixed(2)),
    ].join(','));
  }

  lines.push('');
  lines.push(`${sanitizeCsvCell('RESUMEN DE PAGO')}`);
  lines.push(`${sanitizeCsvCell('Subtotal Capital')},${sanitizeCsvCell(detail.principal.toFixed(2))}`);
  lines.push(`${sanitizeCsvCell('Subtotal Interés')},${sanitizeCsvCell(detail.interest.toFixed(2))}`);
  lines.push(`${sanitizeCsvCell('Total Facturado')},${sanitizeCsvCell(detail.total.toFixed(2))}`);
  lines.push(`${sanitizeCsvCell('Días de Mora')},${sanitizeCsvCell(detail.lateDays)}`);
  lines.push(`${sanitizeCsvCell('Interés Moratorio')},${sanitizeCsvCell(detail.lateInterest.toFixed(2))}`);
  lines.push(`${sanitizeCsvCell('Total a Pagar')},${sanitizeCsvCell(detail.payableTotal.toFixed(2))}`);

  return lines.join('\r\n');
}

/**
 * Returns bootstrap payload filtered server-side by actor role.
 */
export function getBootstrapData(db, actorUser) {
  const user = {
    id: actorUser.id,
    username: actorUser.username,
    name: actorUser.name,
    role: actorUser.role,
    storeId: actorUser.storeId,
    clientId: actorUser.clientId,
  };

  let stores = [];
  let products = [];
  let clients = [];
  let purchases = [];
  let statements = [];
  let payments = [];
  let audit = [];

  if (actorUser.role === 'PLATFORM_ADMIN') {
    stores = db.prepare('SELECT id, name, businessType, address, taxId, active FROM stores ORDER BY name').all().map((s) => ({
      ...s,
      active: Boolean(s.active),
    }));
    audit = db.prepare('SELECT id, at, actorId, action, entityId FROM audit ORDER BY at DESC LIMIT 100').all();
  } else if (actorUser.role === 'STORE_ADMIN') {
    const store = db.prepare('SELECT id, name, businessType, address, taxId, active FROM stores WHERE id = ?').get(actorUser.storeId);
    if (store) {
      stores = [{ ...store, active: Boolean(store.active) }];
    }

    products = db.prepare('SELECT * FROM products WHERE storeId = ? ORDER BY name').all(actorUser.storeId).map((p) => ({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      description: p.description,
      brand: p.brand,
      supplier: p.supplier,
      unit: p.unit,
      imageUrl: p.imageUrl,
      cashPrice: fromCents(p.cashPriceCents),
      creditPrice: fromCents(p.creditPriceCents),
      allowEndOfMonth: Boolean(p.allowEndOfMonth),
      allowInstallments: Boolean(p.allowInstallments),
      active: Boolean(p.active),
    }));

    clients = db.prepare('SELECT * FROM clients WHERE storeId = ? ORDER BY name').all(actorUser.storeId).map((c) => {
      const exposure = calculateClientExposure(db, c.id);
      const limit = fromCents(c.creditLimitCents);
      return {
        id: c.id,
        storeId: c.storeId,
        name: c.name,
        document: c.document,
        phone: c.phone,
        email: c.email,
        address: c.address,
        currency: c.currency,
        creditLimit: limit,
        maxMonths: c.maxMonths,
        cutoffDay: c.cutoffDay,
        cutoffTime: c.cutoffTime,
        paymentDay: c.paymentDay,
        rateType: c.rateType,
        annualRate: c.annualRate,
        capitalizationDays: c.capitalizationDays,
        lateRateType: c.lateRateType,
        lateAnnualRate: c.lateAnnualRate,
        lateCapitalizationDays: c.lateCapitalizationDays,
        active: Boolean(c.active),
        outstandingCapital: exposure,
        availableCredit: Math.max(0, roundMoney(limit - exposure)),
      };
    });

    purchases = db.prepare('SELECT * FROM purchases WHERE storeId = ? ORDER BY purchasedAt DESC').all(actorUser.storeId).map((p) => ({
      id: p.id,
      storeId: p.storeId,
      clientId: p.clientId,
      productId: p.productId,
      productName: p.productName,
      quantity: p.quantity,
      mode: p.mode,
      months: p.months,
      purchasedAt: p.purchasedAt,
      principal: fromCents(p.principalCents),
      graceDays: p.graceDays,
      capitalizedPrincipal: fromCents(p.capitalizedPrincipalCents),
      firstDueDate: p.firstDueDate,
      schedule: JSON.parse(p.scheduleJson),
    }));

    statements = db.prepare('SELECT * FROM statements WHERE storeId = ? ORDER BY cutoffDate DESC').all(actorUser.storeId).map((s) => {
      const client = clients.find((c) => c.id === s.clientId);
      return {
        id: s.id,
        clientId: s.clientId,
        clientName: client ? client.name : '',
        currency: s.currency,
        cutoffDate: s.cutoffDate,
        dueDate: s.dueDate,
        status: s.status,
        principal: fromCents(s.principalCents),
        interest: fromCents(s.interestCents),
        total: fromCents(s.totalCents),
        paidAt: s.paidAt,
        paidAmount: s.paidAmountCents !== null ? fromCents(s.paidAmountCents) : null,
      };
    });

    payments = db.prepare('SELECT * FROM payments WHERE storeId = ? ORDER BY paidAt DESC').all(actorUser.storeId).map((p) => ({
      id: p.id,
      statementId: p.statementId,
      clientId: p.clientId,
      paidAt: p.paidAt,
      amount: fromCents(p.amountCents),
      lateInterest: fromCents(p.lateInterestCents),
      interest: fromCents(p.interestCents),
      capital: fromCents(p.capitalCents),
    }));

    audit = db.prepare('SELECT id, at, actorId, action, entityId FROM audit WHERE actorId = ? ORDER BY at DESC LIMIT 100').all(actorUser.id);
  } else if (actorUser.role === 'CUSTOMER') {
    const store = db.prepare('SELECT id, name, businessType, address, taxId, active FROM stores WHERE id = ?').get(actorUser.storeId);
    if (store) {
      stores = [{ ...store, active: Boolean(store.active) }];
    }

    products = db.prepare('SELECT * FROM products WHERE storeId = ? AND active = 1 ORDER BY name').all(actorUser.storeId).map((p) => ({
      id: p.id,
      storeId: p.storeId,
      name: p.name,
      description: p.description,
      brand: p.brand,
      supplier: p.supplier,
      unit: p.unit,
      imageUrl: p.imageUrl,
      cashPrice: fromCents(p.cashPriceCents),
      creditPrice: fromCents(p.creditPriceCents),
      allowEndOfMonth: Boolean(p.allowEndOfMonth),
      allowInstallments: Boolean(p.allowInstallments),
      active: Boolean(p.active),
    }));

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(actorUser.clientId);
    if (client) {
      const exposure = calculateClientExposure(db, client.id);
      const limit = fromCents(client.creditLimitCents);
      clients = [
        {
          id: client.id,
          storeId: client.storeId,
          name: client.name,
          document: client.document,
          phone: client.phone,
          email: client.email,
          address: client.address,
          currency: client.currency,
          creditLimit: limit,
          maxMonths: client.maxMonths,
          cutoffDay: client.cutoffDay,
          cutoffTime: client.cutoffTime,
          paymentDay: client.paymentDay,
          rateType: client.rateType,
          annualRate: client.annualRate,
          capitalizationDays: client.capitalizationDays,
          lateRateType: client.lateRateType,
          lateAnnualRate: client.lateAnnualRate,
          lateCapitalizationDays: client.lateCapitalizationDays,
          active: Boolean(client.active),
          outstandingCapital: exposure,
          availableCredit: Math.max(0, roundMoney(limit - exposure)),
        },
      ];
    }

    purchases = db.prepare('SELECT * FROM purchases WHERE clientId = ? ORDER BY purchasedAt DESC').all(actorUser.clientId).map((p) => ({
      id: p.id,
      storeId: p.storeId,
      clientId: p.clientId,
      productId: p.productId,
      productName: p.productName,
      quantity: p.quantity,
      mode: p.mode,
      months: p.months,
      purchasedAt: p.purchasedAt,
      principal: fromCents(p.principalCents),
      graceDays: p.graceDays,
      capitalizedPrincipal: fromCents(p.capitalizedPrincipalCents),
      firstDueDate: p.firstDueDate,
      schedule: JSON.parse(p.scheduleJson),
    }));

    statements = db.prepare('SELECT * FROM statements WHERE clientId = ? ORDER BY cutoffDate DESC').all(actorUser.clientId).map((s) => ({
      id: s.id,
      clientId: s.clientId,
      clientName: client ? client.name : '',
      currency: s.currency,
      cutoffDate: s.cutoffDate,
      dueDate: s.dueDate,
      status: s.status,
      principal: fromCents(s.principalCents),
      interest: fromCents(s.interestCents),
      total: fromCents(s.totalCents),
      paidAt: s.paidAt,
      paidAmount: s.paidAmountCents !== null ? fromCents(s.paidAmountCents) : null,
    }));

    payments = db.prepare('SELECT * FROM payments WHERE clientId = ? ORDER BY paidAt DESC').all(actorUser.clientId).map((p) => ({
      id: p.id,
      statementId: p.statementId,
      clientId: p.clientId,
      paidAt: p.paidAt,
      amount: fromCents(p.amountCents),
      lateInterest: fromCents(p.lateInterestCents),
      interest: fromCents(p.interestCents),
      capital: fromCents(p.capitalCents),
    }));
  }

  return {
    user,
    stores,
    products,
    clients,
    purchases,
    statements,
    payments,
    audit,
  };
}
