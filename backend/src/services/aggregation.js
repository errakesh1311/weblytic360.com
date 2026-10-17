const { db } = require('../db');

/**
 * Resolve a {start,end} ISO window from query params.
 * `days=0` is treated as "today so far", i.e. since midnight UTC.
 */
function resolveRange({ start, end, days = 7 } = {}) {
  const endDate = end ? new Date(end) : new Date();

  let startDate;
  if (start) {
    startDate = new Date(start);
  } else if (Number(days) === 0) {
    startDate = new Date(endDate);
    startDate.setUTCHours(0, 0, 0, 0);
  } else {
    startDate = new Date(endDate.getTime() - Number(days) * 86400000);
  }

  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

/** Previous window of equal length, for % change comparisons. */
function previousRange({ start, end }) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const len = e - s;
  return { start: new Date(s - len).toISOString(), end: new Date(s).toISOString() };
}

function rawOverview(siteId, range) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*)                                     AS pageviews,
         COUNT(DISTINCT visitor_id)                   AS visitors,
         COUNT(DISTINCT session_id)                   AS sessions,
         COALESCE(SUM(duration), 0)                   AS totalTime
       FROM events
       WHERE site_id = ? AND type = 'pageview' AND created_at BETWEEN ? AND ?`
    )
    .get(siteId, range.start, range.end);

  const bounce = db
    .prepare(
      `SELECT COUNT(*) AS bounces FROM (
         SELECT session_id FROM events
         WHERE site_id = ? AND type = 'pageview' AND created_at BETWEEN ? AND ?
         GROUP BY session_id HAVING COUNT(*) = 1
       )`
    )
    .get(siteId, range.start, range.end);

  const sessions = row.sessions || 0;
  return {
    pageviews: row.pageviews || 0,
    visitors: row.visitors || 0,
    sessions,
    bounces: bounce.bounces || 0,
    bounceRate: sessions ? Math.round((bounce.bounces / sessions) * 100) : 0,
    avgDuration: sessions ? Math.round(row.totalTime / sessions) : 0,
  };
}

const pctChange = (now, prev) =>
  prev === 0 ? (now > 0 ? 100 : 0) : Math.round(((now - prev) / prev) * 100);

/** Headline KPIs with comparison against the preceding period. */
function getOverview(siteId, query) {
  const range = resolveRange(query);
  const current = rawOverview(siteId, range);
  const previous = rawOverview(siteId, previousRange(range));

  return {
    range,
    ...current,
    change: {
      pageviews: pctChange(current.pageviews, previous.pageviews),
      visitors: pctChange(current.visitors, previous.visitors),
      sessions: pctChange(current.sessions, previous.sessions),
      bounceRate: pctChange(current.bounceRate, previous.bounceRate),
    },
  };
}

/** Time series bucketed by hour or day. */
function getTimeseries(siteId, query = {}) {
  const range = resolveRange(query);
  const unit = query.unit === 'hour' ? 'hour' : 'day';
  const fmt = unit === 'hour' ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';

  return db
    .prepare(
      `SELECT strftime('${fmt}', created_at) AS bucket,
              COUNT(*)                        AS pageviews,
              COUNT(DISTINCT visitor_id)      AS visitors,
              COUNT(DISTINCT session_id)      AS sessions
       FROM events
       WHERE site_id = ? AND type = 'pageview' AND created_at BETWEEN ? AND ?
       GROUP BY bucket ORDER BY bucket`
    )
    .all(siteId, range.start, range.end);
}

const METRIC_COLUMNS = {
  url: 'url',
  referrer: 'referrer_host',
  browser: 'browser',
  os: 'os',
  device: 'device',
  country: 'country',
  screen: 'screen',
  event: 'name',
  utm_source: 'utm_source',
  utm_medium: 'utm_medium',
  utm_campaign: 'utm_campaign',
  utm_term: 'utm_term',
  utm_content: 'utm_content',
  // Derived: the host portion of the page URL (e.g. blog.example.com).
  hostname:
    "substr(replace(replace(url, 'https://', ''), 'http://', ''), 1, " +
    "CASE WHEN instr(replace(replace(url, 'https://', ''), 'http://', ''), '/') = 0 " +
    "THEN length(replace(replace(url, 'https://', ''), 'http://', '')) " +
    "ELSE instr(replace(replace(url, 'https://', ''), 'http://', ''), '/') - 1 END)",
};

/** Top-N breakdown for a given dimension, including each row's share of the total. */
function getMetrics(siteId, type, query = {}) {
  const column = METRIC_COLUMNS[type];
  if (!column) throw new Error(`Unsupported metric type: ${type}`);

  const range = resolveRange(query);
  const limit = Math.min(Number(query.limit) || 10, 1000);
  const eventType = type === 'event' ? 'custom' : 'pageview';

  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(${column}, ''), '(none)') AS x,
              COUNT(*)                                  AS y,
              COUNT(DISTINCT visitor_id)                AS visitors
       FROM events
       WHERE site_id = ? AND type = ? AND created_at BETWEEN ? AND ?
       GROUP BY x ORDER BY y DESC LIMIT ?`
    )
    .all(siteId, eventType, range.start, range.end, limit);

  const total = db
    .prepare(
      `SELECT COUNT(*) AS total FROM events
       WHERE site_id = ? AND type = ? AND created_at BETWEEN ? AND ?`
    )
    .get(siteId, eventType, range.start, range.end).total;

  return rows.map((r) => ({
    ...r,
    percent: total ? Math.round((r.y / total) * 1000) / 10 : 0,
  }));
}

/** Visitors seen in the last N minutes, plus live breakdowns and per-minute series. */
function getActive(siteId, { minutes = 5 } = {}) {
  const windowMin = Math.min(Math.max(Number(minutes) || 5, 1), 60);
  const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

  const { visitors } = db
    .prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS visitors
       FROM events WHERE site_id = ? AND created_at >= ?`
    )
    .get(siteId, since);

  // Reusable live-breakdown by any column over the active window.
  const liveBreakdown = (expr, extraWhere = '') =>
    db
      .prepare(
        `SELECT ${expr} AS x, COUNT(DISTINCT visitor_id) AS y
         FROM events WHERE site_id = ? AND created_at >= ? ${extraWhere}
         GROUP BY x ORDER BY y DESC LIMIT 20`
      )
      .all(siteId, since);

  const pages = liveBreakdown("COALESCE(NULLIF(url, ''), '(none)')");
  const countries = liveBreakdown("COALESCE(NULLIF(country, ''), '(unknown)')");
  const sources = liveBreakdown("COALESCE(NULLIF(referrer_host, ''), '(direct)')");
  const devices = liveBreakdown("COALESCE(NULLIF(device, ''), '(unknown)')");
  const browsers = liveBreakdown("COALESCE(NULLIF(browser, ''), '(unknown)')");

  // Live custom events use COUNT(*) rather than distinct visitors.
  const events = db
    .prepare(
      `SELECT COALESCE(NULLIF(name, ''), '(unnamed)') AS x, COUNT(*) AS y
       FROM events WHERE site_id = ? AND type = 'custom' AND created_at >= ?
       GROUP BY x ORDER BY y DESC LIMIT 20`
    )
    .all(siteId, since);

  // Pageviews for each of the last 30 minutes, zero-filled so the chart is continuous.
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:%M', created_at) AS bucket, COUNT(*) AS y
       FROM events
       WHERE site_id = ? AND type = 'pageview' AND created_at >= ?
       GROUP BY bucket`
    )
    .all(siteId, new Date(Date.now() - 30 * 60 * 1000).toISOString());

  const counts = new Map(rows.map((r) => [r.bucket, r.y]));
  const perMinute = [];
  for (let i = 29; i >= 0; i--) {
    const t = new Date(Date.now() - i * 60 * 1000);
    const key = t.toISOString().slice(0, 16);
    perMinute.push({ bucket: key, label: `-${i}m`, y: counts.get(key) || 0 });
  }

  // Pageviews per second for the last minute (the "Last minute" trends panel).
  const secRows = db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:%M:%S', created_at) AS bucket, COUNT(*) AS y
       FROM events
       WHERE site_id = ? AND type = 'pageview' AND created_at >= ?
       GROUP BY bucket`
    )
    .all(siteId, new Date(Date.now() - 60 * 1000).toISOString());

  const secCounts = new Map(secRows.map((r) => [r.bucket, r.y]));
  const perSecond = [];
  for (let i = 59; i >= 0; i--) {
    const t = new Date(Date.now() - i * 1000);
    const key = t.toISOString().slice(0, 19);
    perSecond.push({ bucket: key, label: `-${i}s`, y: secCounts.get(key) || 0 });
  }

  return {
    windowMinutes: windowMin,
    visitors,
    pages,
    countries,
    sources,
    devices,
    browsers,
    events,
    perMinute,
    perSecond,
  };
}

/* ------------------------------------------------------------------ */
/* AI traffic                                                          */
/* ------------------------------------------------------------------ */

function aiTotals(siteId, range) {
  const row = db
    .prepare(
      `SELECT
         COUNT(*)                                                       AS hits,
         COUNT(DISTINCT visitor_id)                                     AS visitors,
         SUM(CASE WHEN ai_kind = 'referral' THEN 1 ELSE 0 END)          AS referrals,
         SUM(CASE WHEN ai_kind = 'crawler'  THEN 1 ELSE 0 END)          AS crawls
       FROM events
       WHERE site_id = ? AND ai_kind IS NOT NULL AND created_at BETWEEN ? AND ?`
    )
    .get(siteId, range.start, range.end);

  return {
    hits: row.hits || 0,
    visitors: row.visitors || 0,
    referrals: row.referrals || 0,
    crawls: row.crawls || 0,
  };
}

/** Breakdown of AI traffic by a dimension, optionally filtered to one kind. */
function aiBreakdown(siteId, range, column, kind) {
  const rows = db
    .prepare(
      `SELECT ${column} AS x,
              COUNT(*)                   AS y,
              COUNT(DISTINCT visitor_id) AS visitors
       FROM events
       WHERE site_id = ? AND ai_kind IS NOT NULL AND created_at BETWEEN ? AND ?
         AND (? IS NULL OR ai_kind = ?)
       GROUP BY x ORDER BY y DESC LIMIT 20`
    )
    .all(siteId, range.start, range.end, kind ?? null, kind ?? null);

  const total = rows.reduce((sum, r) => sum + r.y, 0);
  return rows.map((r) => ({
    ...r,
    percent: total ? Math.round((r.y / total) * 1000) / 10 : 0,
  }));
}

/**
 * Everything the AI Traffic page renders: totals, its share of all traffic,
 * a daily series split by kind, and breakdowns by source / vendor / page.
 */
function getAiTraffic(siteId, query = {}) {
  const range = resolveRange(query);
  const totals = aiTotals(siteId, range);
  const previous = aiTotals(siteId, previousRange(range));

  const allHits = db
    .prepare(
      `SELECT COUNT(*) AS c FROM events
       WHERE site_id = ? AND created_at BETWEEN ? AND ?`
    )
    .get(siteId, range.start, range.end).c;

  const series = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) AS bucket,
              SUM(CASE WHEN ai_kind = 'referral' THEN 1 ELSE 0 END) AS referrals,
              SUM(CASE WHEN ai_kind = 'crawler'  THEN 1 ELSE 0 END) AS crawls,
              COUNT(*)                                              AS y
       FROM events
       WHERE site_id = ? AND ai_kind IS NOT NULL AND created_at BETWEEN ? AND ?
       GROUP BY bucket ORDER BY bucket`
    )
    .all(siteId, range.start, range.end);

  return {
    range,
    totals,
    share: allHits ? Math.round((totals.hits / allHits) * 1000) / 10 : 0,
    change: {
      hits: pctChange(totals.hits, previous.hits),
      visitors: pctChange(totals.visitors, previous.visitors),
      referrals: pctChange(totals.referrals, previous.referrals),
      crawls: pctChange(totals.crawls, previous.crawls),
    },
    series,
    sources: aiBreakdown(siteId, range, 'ai_source', null),
    vendors: aiBreakdown(siteId, range, 'ai_vendor', null),
    assistants: aiBreakdown(siteId, range, 'ai_source', 'referral'),
    crawlers: aiBreakdown(siteId, range, 'ai_source', 'crawler'),
    pages: aiBreakdown(siteId, range, "COALESCE(NULLIF(url, ''), '/')", null),
  };
}

/* ------------------------------------------------------------------ */
/* Network (all of a user's sites combined)                           */
/* ------------------------------------------------------------------ */

/**
 * Rolls every site a user owns into one view: combined KPIs plus a
 * per-site leaderboard. `sites` is the list from Site.findByUser().
 */
function getNetwork(sites, query = {}) {
  const range = resolveRange(query);

  const perSite = sites.map((site) => {
    const current = rawOverview(site.id, range);
    const active = getActive(site.id);
    return {
      id: site.id,
      name: site.name,
      domain: site.domain,
      visitors: current.visitors,
      pageviews: current.pageviews,
      sessions: current.sessions,
      bounceRate: current.bounceRate,
      avgDuration: current.avgDuration,
      live: active.visitors,
    };
  });

  const totals = perSite.reduce(
    (acc, s) => {
      acc.visitors += s.visitors;
      acc.pageviews += s.pageviews;
      acc.sessions += s.sessions;
      acc.live += s.live;
      return acc;
    },
    { visitors: 0, pageviews: 0, sessions: 0, live: 0 }
  );

  // Weighted-average bounce rate across sites, by session volume.
  const weightedBounce = perSite.reduce((sum, s) => sum + s.bounceRate * s.sessions, 0);
  totals.bounceRate = totals.sessions ? Math.round(weightedBounce / totals.sessions) : 0;

  return {
    range,
    siteCount: sites.length,
    totals,
    sites: perSite.sort((a, b) => b.visitors - a.visitors),
  };
}

/**
 * Entry / exit page breakdown.
 * The entry page is the first pageview of a session (by created_at); the exit
 * page is the last. Counts are DISTINCT sessions per page.
 */
function getEntryExitPages(siteId, which, query = {}) {
  const range = resolveRange(query);
  const limit = Math.min(Number(query.limit) || 10, 1000);
  const pick = which === 'exit' ? 'MAX' : 'MIN';

  // For each session pick the first/last pageview id by created_at.
  const rows = db
    .prepare(
      `WITH edges AS (
         SELECT session_id,
                ${pick}(created_at) AS edge_at
         FROM events
         WHERE site_id = ? AND type = 'pageview'
           AND created_at BETWEEN ? AND ?
         GROUP BY session_id
       ),
       pages AS (
         SELECT e.session_id, e.visitor_id,
                COALESCE(NULLIF(e.url, ''), '(none)') AS x
         FROM events e
         JOIN edges ed
           ON ed.session_id = e.session_id AND ed.edge_at = e.created_at
         WHERE e.site_id = ? AND e.type = 'pageview'
       )
       SELECT x,
              COUNT(*)                   AS y,
              COUNT(DISTINCT visitor_id) AS visitors
       FROM pages
       GROUP BY x ORDER BY y DESC LIMIT ?`
    )
    .all(siteId, range.start, range.end, siteId, limit);

  const total = rows.reduce((sum, r) => sum + r.y, 0);
  return rows.map((r) => ({
    ...r,
    percent: total ? Math.round((r.y / total) * 1000) / 10 : 0,
  }));
}

module.exports = {
  resolveRange,
  getOverview,
  getTimeseries,
  getMetrics,
  getActive,
  getAiTraffic,
  getNetwork,
  getEntryExitPages,
  METRIC_COLUMNS,
};