const crypto = require('crypto');
const { db } = require('../db');

const Site = {
  create({ userId, name, domain, timezone = 'UTC' }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO sites (id, user_id, name, domain, timezone) VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, name, domain, timezone);
    return Site.findById(id);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM sites WHERE id = ?`).get(id);
  },

  findByUser(userId) {
    return db
      .prepare(`SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId);
  },

  countByUser(userId) {
    return db.prepare(`SELECT COUNT(*) AS c FROM sites WHERE user_id = ?`).get(userId).c;
  },

  update(id, { name, domain, timezone }) {
    const site = Site.findById(id);
    if (!site) return null;
    db.prepare(`UPDATE sites SET name = ?, domain = ?, timezone = ? WHERE id = ?`).run(
      name ?? site.name,
      domain ?? site.domain,
      timezone ?? site.timezone,
      id
    );
    return Site.findById(id);
  },

  remove(id) {
    db.prepare(`DELETE FROM events WHERE site_id = ?`).run(id);
    db.prepare(`DELETE FROM sites WHERE id = ?`).run(id);
  },

  /** Returns the site only if it belongs to the given user. */
  ownedBy(id, userId) {
    return db.prepare(`SELECT * FROM sites WHERE id = ? AND user_id = ?`).get(id, userId);
  },
};

module.exports = Site;