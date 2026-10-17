const express = require('express');
const ImportJob = require('../models/ImportJob');
const Event = require('../models/Event');
const Site = require('../models/Site');
const Notification = require('../models/Notification');
const { db } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const MAX_ROWS = 50000;

const publicJob = (j) => ({
  id: j.id,
  siteId: j.site_id,
  source: j.source,
  filename: j.filename,
  status: j.status,
  totalRows: j.total_rows,
  importedRows: j.imported_rows,
  error: j.error,
  createdAt: j.created_at,
  completedAt: j.completed_at,
});

/**
 * Minimal CSV parser: handles quoted fields and commas inside quotes. Returns
 * an array of row objects keyed by the (lower-cased) header names.
 */
function parseCsv(text) {
  const rows = [];
  const lines = String(text).replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows };

  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

/** List the current user's import jobs. */
router.get('/', (req, res, next) => {
  try {
    res.json({ jobs: ImportJob.list(req.user.id).map(publicJob) });
  } catch (error) {
    next(error);
  }
});

/**
 * Create and run an import. Expects JSON: { siteId, filename, csv }.
 * Supported columns: url, type, referrer, browser, os, device, country,
 * utm_source, utm_medium, utm_campaign, timestamp/created_at, visitor_id.
 */
router.post('/', (req, res, next) => {
  try {
    const { siteId, filename = 'upload.csv', csv } = req.body;

    const site = Site.ownedBy(siteId, req.user.id);
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ message: 'Please provide CSV data to import' });
    }

    const { headers, rows } = parseCsv(csv);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'No data rows found in the file' });
    }
    if (!headers.includes('url')) {
      return res.status(400).json({ message: 'CSV must include at least a "url" column' });
    }
    if (rows.length > MAX_ROWS) {
      return res
        .status(400)
        .json({ message: `Too many rows (max ${MAX_ROWS.toLocaleString()})` });
    }

    const job = ImportJob.create({
      userId: req.user.id,
      siteId,
      source: 'csv',
      filename,
      totalRows: rows.length,
    });

    let imported = 0;    const insert = db.prepare(Event.INSERT_SQL);
    const now = Date.now();
    const run = () => {
      rows.forEach((row, i) => {
        if (!row.url) return;
        const ts =
          row.timestamp || row.created_at || row.date
            ? new Date(row.timestamp || row.created_at || row.date)
            : new Date(now - (rows.length - i) * 1000);
        const created = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();

        const record = {
          id: require('crypto').randomUUID(),
          site_id: siteId,
          session_id: row.session_id || require('crypto').randomUUID(),
          visitor_id: row.visitor_id || `import-${require('crypto').randomUUID().slice(0, 8)}`,
          type: row.type || 'pageview',
          name: row.name || null,
          url: row.url,
          referrer: row.referrer || null,
          referrer_host: row.referrer_host || null,
          utm_source: row.utm_source || null,
          utm_medium: row.utm_medium || null,
          utm_campaign: row.utm_campaign || null,
          browser: row.browser || null,
          os: row.os || null,
          device: row.device || null,
          country: row.country || null,
          screen: row.screen || null,
          duration: Number(row.duration) || 0,
          props: null,
          ai_source: null,
          ai_vendor: null,
          ai_kind: null,          created_at: created,
        };
        insert.run(...Event.toValues(record));
        imported += 1;
      });
    };

    try {
      db.exec('BEGIN');
      run();
      db.exec('COMMIT');
      ImportJob.update(job.id, {
        status: 'completed',
        importedRows: imported,
        completedAt: new Date().toISOString(),
      });
      Notification.create({
        userId: req.user.id,
        type: 'success',
        title: 'Import complete',
        body: `Imported ${imported.toLocaleString()} events into ${site.name}.`,        link: `/dashboard?site=${siteId}`,
      });
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch (_) {
        /* no active transaction */
      }
      ImportJob.update(job.id, {
        status: 'failed',
        error: err.message,
        completedAt: new Date().toISOString(),
      });
      throw err;
    }

    res.status(201).json({ job: publicJob(ImportJob.findById(job.id)) });
  } catch (error) {
    next(error);
  }
});

/** Delete an import job record (does not remove the imported events). */
router.delete('/:id', (req, res, next) => {
  try {
    const job = ImportJob.findById(req.params.id);
    if (!job || job.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Import job not found' });
    }
    ImportJob.remove(job.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
