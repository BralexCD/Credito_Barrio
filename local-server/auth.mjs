import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';

const KEY_LENGTH = 64;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hashes a plaintext password using scrypt and a cryptographically secure random salt.
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be a string of at least 8 characters');
  }
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return {
    salt,
    passwordHash: derivedKey.toString('hex'),
  };
}

/**
 * Verifies a plaintext password against stored salt and hash using timingSafeEqual.
 */
export function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  try {
    const derivedKey = scryptSync(password, salt, KEY_LENGTH);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (derivedKey.length !== storedBuffer.length) return false;
    return timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a SHA-256 hash of a bearer token.
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new session for a user and stores its hash in the database.
 * Returns the raw token to return to the client.
 */
export function createSession(db, userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();
  const createdAt = now.toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, tokenHash, userId, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, tokenHash, userId, expiresAt, createdAt);

  return token;
}

/**
 * Deletes a session given the raw token.
 */
export function deleteSession(db, token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  const stmt = db.prepare('DELETE FROM sessions WHERE tokenHash = ?');
  stmt.run(tokenHash);
}

/**
 * Authenticates a request token.
 * Validates token validity, expiration, and ensures user, store, and client (if applicable) are active.
 */
export function authenticateToken(db, token) {
  if (!token || typeof token !== 'string') return null;

  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const stmt = db.prepare(`
    SELECT s.id as sessionId, s.expiresAt,
           u.id, u.username, u.name, u.role, u.storeId, u.clientId, u.active as userActive
    FROM sessions s
    JOIN users u ON s.userId = u.id
    WHERE s.tokenHash = ? AND s.expiresAt > ?
  `);

  const row = stmt.get(tokenHash, nowIso);
  if (!row) return null;

  // Check user active
  if (!row.userActive) return null;

  // Check store active if user belongs to a store
  if (row.storeId) {
    const storeStmt = db.prepare('SELECT active FROM stores WHERE id = ?');
    const store = storeStmt.get(row.storeId);
    if (!store || !store.active) return null;
  }

  // Check client active if user is a customer
  if (row.clientId) {
    const clientStmt = db.prepare('SELECT active FROM clients WHERE id = ?');
    const client = clientStmt.get(row.clientId);
    if (!client || !client.active) return null;
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    storeId: row.storeId,
    clientId: row.clientId,
  };
}
