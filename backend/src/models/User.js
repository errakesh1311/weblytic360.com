const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const config = require('../config');

const User = {
  async create({ name, email, password, plan = 'free' }) {
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date(
      Date.now() + config.TRIAL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    db.prepare(
      `INSERT INTO users (id, name, email, password, plan, trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, String(email).toLowerCase(), hash, plan, trialEndsAt);
    return User.findById(id);
  },

  findById(id) {
    return db
      .prepare(
        `SELECT id, name, email, plan, trial_ends_at, dark_mode, timezone, week_starts_on, created_at FROM users WHERE id = ?`
      )
      .get(id);
  },

  findByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
  },

  comparePassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  updatePlan(id, plan) {
    db.prepare(`UPDATE users SET plan = ? WHERE id = ?`).run(plan, id);
    return User.findById(id);
  },

  updateName(id, name) {
    db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, id);
    return User.findById(id);
  },

  updatePreferences(id, { darkMode, timezone, weekStartsOn }) {
    const user = User.findById(id);
    if (!user) return null;
    db.prepare(
      `UPDATE users SET dark_mode = ?, timezone = ?, week_starts_on = ? WHERE id = ?`
    ).run(
      darkMode === undefined ? user.dark_mode : darkMode ? 1 : 0,
      timezone ?? user.timezone,
      weekStartsOn ?? user.week_starts_on,
      id
    );
    return User.findById(id);
  },

  async updatePassword(id, password) {
    const hash = await bcrypt.hash(password, 10);
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hash, id);
    return User.findById(id);
  },

  /**
   * Stores the SHA-256 of a reset token so a leaked database still cannot be
   * used to take over accounts. Returns the raw token for the caller to email.
   */
  createResetToken(id, ttlMs = 60 * 60 * 1000) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    db.prepare(
      `UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?`
    ).run(hash, expiresAt, id);

    return token;
  },

  findByResetToken(token) {
    const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const user = db.prepare(`SELECT * FROM users WHERE reset_token = ?`).get(hash);

    if (!user) return null;
    if (!user.reset_token_expires_at) return null;
    if (new Date(user.reset_token_expires_at).getTime() < Date.now()) return null;

    return user;
  },

  clearResetToken(id) {
    db.prepare(
      `UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?`
    ).run(id);
  },

  /**
   * Describes where a user sits in their trial. Paid plans are never on trial,
   * and accounts created before this column existed simply have no trial.
   */
  trialStatus(user) {
    if (!user?.trial_ends_at || user.plan !== 'free') {
      return { onTrial: false, expired: false, endsAt: null, daysLeft: null };
    }

    const endsAt = new Date(user.trial_ends_at);
    const msLeft = endsAt.getTime() - Date.now();

    return {
      onTrial: msLeft > 0,
      expired: msLeft <= 0,
      endsAt: user.trial_ends_at,
      daysLeft: Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))),
    };
  },
};

module.exports = User;