import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function addColumnIfNotExists(db, tableName, columnName, colDefinition) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!cols.some((c) => c.name === columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${colDefinition};`);
    }
  } catch {
    // Ignore migration check errors if table doesn't exist yet
  }
}

/**
 * Initializes and configures the SQLite database using Node's built-in node:sqlite.
 */
export function initDatabase(dbPath = ':memory:') {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable WAL mode and foreign keys if supported
  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch {
    // Ignore PRAGMA errors in in-memory mode if any
  }

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      businessType TEXT NOT NULL,
      address TEXT NOT NULL,
      taxId TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- PLATFORM_ADMIN, STORE_ADMIN, CUSTOMER
      storeId TEXT,
      clientId TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      tokenHash TEXT UNIQUE NOT NULL,
      userId TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      name TEXT NOT NULL,
      document TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      currency TEXT NOT NULL, -- PEN, USD
      creditLimitCents INTEGER NOT NULL,
      maxMonths INTEGER NOT NULL,
      cutoffDay INTEGER NOT NULL,
      cutoffTime TEXT NOT NULL,
      paymentDay INTEGER NOT NULL,
      rateType TEXT NOT NULL, -- EFFECTIVE, NOMINAL
      annualRate REAL NOT NULL,
      capitalizationDays INTEGER NOT NULL DEFAULT 30,
      lateRateType TEXT NOT NULL, -- EFFECTIVE, NOMINAL
      lateAnnualRate REAL NOT NULL,
      lateCapitalizationDays INTEGER NOT NULL DEFAULT 30,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      supplier TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'und',
      imageUrl TEXT NOT NULL DEFAULT '',
      cashPriceCents INTEGER NOT NULL,
      creditPriceCents INTEGER NOT NULL,
      allowEndOfMonth INTEGER NOT NULL DEFAULT 1,
      allowInstallments INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity REAL NOT NULL,
      mode TEXT NOT NULL, -- END_OF_MONTH, INSTALLMENTS
      months INTEGER NOT NULL,
      purchasedAt TEXT NOT NULL,
      principalCents INTEGER NOT NULL,
      graceDays INTEGER NOT NULL,
      capitalizedPrincipalCents INTEGER NOT NULL,
      firstDueDate TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      snapshotCutoffTime TEXT NOT NULL DEFAULT '18:00',
      snapshotRateType TEXT NOT NULL,
      snapshotAnnualRate REAL NOT NULL,
      snapshotCapitalizationDays INTEGER NOT NULL,
      snapshotLateRateType TEXT NOT NULL,
      snapshotLateAnnualRate REAL NOT NULL,
      snapshotLateCapitalizationDays INTEGER NOT NULL,
      scheduleJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS obligations (
      id TEXT PRIMARY KEY,
      purchaseId TEXT NOT NULL,
      storeId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      installmentNumber INTEGER NOT NULL,
      cutoffDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      capitalCents INTEGER NOT NULL,
      interestCents INTEGER NOT NULL,
      totalCents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      snapshotCutoffTime TEXT NOT NULL DEFAULT '18:00',
      snapshotLateRateType TEXT NOT NULL DEFAULT 'EFFECTIVE',
      snapshotLateAnnualRate REAL NOT NULL DEFAULT 0,
      snapshotLateCapitalizationDays INTEGER NOT NULL DEFAULT 30,
      statementId TEXT DEFAULT NULL,
      isPaid INTEGER NOT NULL DEFAULT 0,
      paidAt TEXT DEFAULT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (purchaseId) REFERENCES purchases(id),
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (clientId) REFERENCES clients(id),
      FOREIGN KEY (statementId) REFERENCES statements(id)
    );

    CREATE TABLE IF NOT EXISTS statements (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      cutoffDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, PAID
      principalCents INTEGER NOT NULL,
      interestCents INTEGER NOT NULL,
      totalCents INTEGER NOT NULL,
      paidAt TEXT DEFAULT NULL,
      paidAmountCents INTEGER DEFAULT NULL,
      snapshotLateRateType TEXT NOT NULL,
      snapshotLateAnnualRate REAL NOT NULL,
      snapshotLateCapitalizationDays INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL,
      statementId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      paidAt TEXT NOT NULL,
      amountCents INTEGER NOT NULL,
      lateInterestCents INTEGER NOT NULL,
      interestCents INTEGER NOT NULL,
      capitalCents INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (storeId) REFERENCES stores(id),
      FOREIGN KEY (statementId) REFERENCES statements(id),
      FOREIGN KEY (clientId) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      actorId TEXT, -- Null allowed for SYSTEM automated closures
      action TEXT NOT NULL,
      entityId TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(tokenHash);
    CREATE INDEX IF NOT EXISTS idx_clients_store ON clients(storeId);
    CREATE INDEX IF NOT EXISTS idx_products_store ON products(storeId);
    CREATE INDEX IF NOT EXISTS idx_purchases_client ON purchases(clientId);
    CREATE INDEX IF NOT EXISTS idx_obligations_client_paid ON obligations(clientId, isPaid);
    CREATE INDEX IF NOT EXISTS idx_obligations_statement ON obligations(statementId);
    CREATE INDEX IF NOT EXISTS idx_statements_store ON statements(storeId);
    CREATE INDEX IF NOT EXISTS idx_statements_client ON statements(clientId);
    CREATE INDEX IF NOT EXISTS idx_audit_at ON audit(at);
  `);

  // Safe non-destructive schema migrations for existing databases
  addColumnIfNotExists(db, 'purchases', 'currency', "TEXT NOT NULL DEFAULT 'PEN'");
  addColumnIfNotExists(db, 'purchases', 'snapshotCutoffTime', "TEXT NOT NULL DEFAULT '18:00'");
  addColumnIfNotExists(db, 'obligations', 'currency', "TEXT NOT NULL DEFAULT 'PEN'");
  addColumnIfNotExists(db, 'obligations', 'snapshotCutoffTime', "TEXT NOT NULL DEFAULT '18:00'");
  addColumnIfNotExists(db, 'obligations', 'snapshotLateRateType', "TEXT NOT NULL DEFAULT 'EFFECTIVE'");
  addColumnIfNotExists(db, 'obligations', 'snapshotLateAnnualRate', 'REAL NOT NULL DEFAULT 0');
  addColumnIfNotExists(db, 'obligations', 'snapshotLateCapitalizationDays', 'INTEGER NOT NULL DEFAULT 30');
  addColumnIfNotExists(db, 'statements', 'paidAmountCents', 'INTEGER DEFAULT NULL');

  return db;
}

/**
 * Executes a function within a SQLite transaction.
 */
export function runInTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback errors if already aborted
    }
    throw err;
  }
}
