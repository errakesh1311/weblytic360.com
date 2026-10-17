PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'free',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sites (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL,
    timezone    TEXT NOT NULL DEFAULT 'UTC',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);

CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    site_id       TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    visitor_id    TEXT NOT NULL,
    type          TEXT NOT NULL DEFAULT 'pageview',
    name          TEXT,
    url           TEXT,
    referrer      TEXT,
    referrer_host TEXT,
    utm_source    TEXT,
    utm_medium    TEXT,
    utm_campaign  TEXT,
    browser       TEXT,
    os            TEXT,
    device        TEXT,
    country       TEXT,
    screen        TEXT,
    duration      INTEGER DEFAULT 0,
    props         TEXT,
    ai_source     TEXT,
    ai_vendor     TEXT,
    ai_kind       TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_site_time ON events(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(site_id, visitor_id);
-- idx_events_ai is created in db/index.js, after the ai_* columns are
-- back-filled onto databases that predate them.