const crypto = require('crypto');
const { db } = require('../db');

const SCOPES = ['read', 'write'];

/** Hashes a raw key the same way for storage and lookup. */
function hashKey(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

const ApiKey = {
  SCOPES,

  list(userId) {
    return db
      .prepare(`SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM api_keys WHERE id = ?`).get(id);
  },

  /**
   * Generates a new key. The raw secret is returned once here and never stored
   * in plaintext — only its SHA-256 hash is persisted.
   */
  create({ userId, name, scope = 'read' }) {
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(24).toString('hex');
    const prefix = `w360_${scope === 'write' ? 'w' : 'r'}_${secret.slice(0, 6)}`;
    const raw = `${prefix}.${secret}`;

    db.prepare(
      `INSERT INTO api_keys (id, user_id, name, prefix, key_hash, scope)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, name, prefix, hashKey(raw), scope);

    return { record: ApiKey.findById(id), raw };
  },

  findByRawKey(raw) {
    const key = db
      .prepare(`SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`)
      .get(hashKey(raw));
    return key || null;
  },

  touch(id) {
    db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(id);
  },

  revoke(id) {
    db.prepare(`UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ?`).run(id);
    return ApiKey.findById(id);
  },

  remove(id) {
    db.prepare(`DELETE FROM api_keys WHERE id = ?`).run(id);
  },
};

module.exports = ApiKey;
