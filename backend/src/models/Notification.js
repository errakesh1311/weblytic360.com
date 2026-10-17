const crypto = require('crypto');
const { db } = require('../db');

const Notification = {
  create({ userId, type = 'info', title, body = null, link = null }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, userId, type, title, body, link);
    return Notification.findById(id);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(id);
  },

  findByUser(userId, limit = 30) {
    return db
      .prepare(
        `SELECT * FROM notifications WHERE user_id = ?
         ORDER BY created_at DESC, rowid DESC LIMIT ?`
      )
      .all(userId, limit);
  },

  countUnread(userId) {
    return db
      .prepare(`SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`)
      .get(userId).c;
  },

  markRead(id, userId) {
    db.prepare(
      `UPDATE notifications SET read_at = datetime('now')
       WHERE id = ? AND user_id = ? AND read_at IS NULL`
    ).run(id, userId);
    return Notification.findById(id);
  },

  markAllRead(userId) {
    db.prepare(
      `UPDATE notifications SET read_at = datetime('now')
       WHERE user_id = ? AND read_at IS NULL`
    ).run(userId);
  },

  remove(id, userId) {
    db.prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`).run(id, userId);
  },
};

module.exports = Notification;
