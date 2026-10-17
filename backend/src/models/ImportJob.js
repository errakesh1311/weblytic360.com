const crypto = require('crypto');
const { db } = require('../db');

const STATUSES = ['pending', 'processing', 'completed', 'failed'];

const ImportJob = {
  STATUSES,

  list(userId) {
    return db
      .prepare(`SELECT * FROM import_jobs WHERE user_id = ? ORDER BY created_at DESC`)
      .all(userId);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM import_jobs WHERE id = ?`).get(id);
  },

  create({ userId, siteId, source = 'csv', filename = null, totalRows = 0 }) {
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO import_jobs (id, user_id, site_id, source, filename, total_rows, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    ).run(id, userId, siteId, source, filename, totalRows);
    return ImportJob.findById(id);
  },

  update(id, { status, importedRows, error, completedAt }) {
    const job = ImportJob.findById(id);
    if (!job) return null;
    db.prepare(
      `UPDATE import_jobs
       SET status = ?, imported_rows = ?, error = ?, completed_at = ?
       WHERE id = ?`
    ).run(
      status ?? job.status,
      importedRows ?? job.imported_rows,
      error ?? job.error,
      completedAt ?? job.completed_at,
      id
    );
    return ImportJob.findById(id);
  },

  remove(id) {
    db.prepare(`DELETE FROM import_jobs WHERE id = ?`).run(id);
  },
};

module.exports = ImportJob;
