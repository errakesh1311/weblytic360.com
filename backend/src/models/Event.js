const crypto = require('crypto');
const { db } = require('../db');

const COLUMNS = [
  'site_id', 'session_id', 'visitor_id', 'type', 'name', 'url', 'referrer',
  'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'browser',
  'os', 'device', 'country', 'screen', 'duration', 'props',
  'ai_source', 'ai_vendor', 'ai_kind',
];

const ALL_COLUMNS = ['id', ...COLUMNS, 'created_at'];

const INSERT_SQL = `INSERT INTO events (${ALL_COLUMNS.join(', ')})
   VALUES (${ALL_COLUMNS.map(() => '?').join(', ')})`;

/** Flattens a row object into the positional values node:sqlite expects. */
function toValues(row) {
  return ALL_COLUMNS.map((c) => row[c] ?? null);
}

const Event = {
  INSERT_SQL,
  toValues,

  create(data) {
    const row = { id: crypto.randomUUID(), created_at: new Date().toISOString() };
    for (const col of COLUMNS) row[col] = data[col] ?? null;
    row.duration = data.duration ?? 0;
    row.type = data.type || 'pageview';
    db.prepare(INSERT_SQL).run(...toValues(row));
    return row;
  },

  findBySite(siteId, { start, end, limit = 100 } = {}) {
    return db
      .prepare(
        `SELECT * FROM events
         WHERE site_id = ? AND created_at BETWEEN ? AND ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(siteId, start, end, limit);
  },

  countByUserSince(userId, sinceIso) {
    return db
      .prepare(
        `SELECT COUNT(*) AS c FROM events e
         JOIN sites s ON s.id = e.site_id
         WHERE s.user_id = ? AND e.created_at >= ?`
      )
      .get(userId, sinceIso).c;
  },

  remove(id) {
    db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
  },
};

module.exports = Event;