/**
 * Seeds realistic historical + live demo data so every report page has
 * something to show: pageviews with UTM params, custom events, and
 * multi-page sessions (for entry/exit page detection).
 *
 *   node scripts/seed-demo.js [siteId] [visitors]
 *
 * If no siteId is given it uses the first site. Safe to run multiple times.
 */
require('dotenv').config();
const crypto = require('crypto');
const { db, init } = require('../src/db');
const Event = require('../src/models/Event');

init();

const siteId =
  process.argv[2] ||
  db.prepare('SELECT id FROM sites ORDER BY created_at LIMIT 1').get()?.id;
const visitorCount = Number(process.argv[3]) || 60;

if (!siteId) {
  console.error('No site found. Run `npm run seed` first.');
  process.exit(1);
}

const pages = ['/', '/pricing', '/blog', '/features', '/about', '/contact', '/docs'];
const countries = ['IN', 'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP', 'BR', 'NL'];
const devices = ['desktop', 'mobile', 'tablet'];
const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
const oses = ['Windows', 'macOS', 'Android', 'iOS', 'Linux'];
const referrers = [null, 'google.com', 'twitter.com', 'github.com', 'reddit.com', 'bing.com'];

const utmSources = [null, 'google', 'newsletter', 'twitter', 'producthunt'];
const utmMediums = [null, 'cpc', 'email', 'social', 'organic'];
const utmCampaigns = [null, 'launch2026', 'black-friday', 'spring-sale', 'retargeting'];
const utmTerms = [null, 'analytics', 'privacy tool', 'plausible alternative', 'web stats'];
const utmContents = [null, 'hero-cta', 'sidebar-banner', 'footer-link', 'blog-inline'];

const customEvents = ['Signup', 'Subscribe', 'Download', 'Contact Form', 'Add to Cart'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (n) => Math.floor(Math.random() * n);

let pageviews = 0;
let events = 0;

for (let i = 0; i < visitorCount; i++) {
  const visitorId = crypto.randomBytes(16).toString('hex');
  const sessionId = visitorId;

  // Most visitors are recent-ish; ~20% are "live" (last few minutes).
  const live = Math.random() < 0.2;
  const minutesAgo = live ? randInt(5) : randInt(60 * 24 * 7); // up to 7 days
  const baseTime = Date.now() - minutesAgo * 60 * 1000;

  const country = pick(countries);
  const device = pick(devices);
  const browser = pick(browsers);
  const os = pick(oses);
  const refHost = pick(referrers);

  const utm = {
    utm_source: pick(utmSources),
    utm_medium: pick(utmMediums),
    utm_campaign: pick(utmCampaigns),
    utm_term: pick(utmTerms),
    utm_content: pick(utmContents),
  };

  // 1-4 pageviews per session → gives distinct entry & exit pages.
  const views = 1 + randInt(4);
  for (let v = 0; v < views; v++) {
    const ts = new Date(baseTime + v * 30 * 1000).toISOString();
    const row = {
      site_id: siteId,
      session_id: sessionId,
      visitor_id: visitorId,
      type: 'pageview',
      url: pick(pages),
      referrer: refHost ? `https://${refHost}/` : null,
      referrer_host: refHost,
      browser,
      os,
      device,
      country,
      screen: '1920x1080',
      duration: randInt(180),
      // UTM only on the first (entry) pageview, like a real campaign landing.
      ...(v === 0 ? utm : {}),
    };
    const created = Event.create(row);
    // Backdate created_at to our synthetic timestamp.
    db.prepare('UPDATE events SET created_at = ? WHERE id = ?').run(ts, created.id);
    pageviews++;
  }

  // ~35% of sessions fire a custom event.
  if (Math.random() < 0.35) {
    const ts = new Date(baseTime + views * 30 * 1000).toISOString();
    const created = Event.create({
      site_id: siteId,
      session_id: sessionId,
      visitor_id: visitorId,
      type: 'custom',
      name: pick(customEvents),
      url: pick(pages),
      browser,
      os,
      device,
      country,
    });
    db.prepare('UPDATE events SET created_at = ? WHERE id = ?').run(ts, created.id);
    events++;
  }
}

console.log(`\n✅ Seeded demo data for site ${siteId}`);
console.log(`   Visitors:   ${visitorCount}`);
console.log(`   Pageviews:  ${pageviews}`);
console.log(`   Custom events: ${events}`);
console.log(`\n   Now every report page (Events, UTM, Entry/Exit) has data.\n`);
process.exit(0);
