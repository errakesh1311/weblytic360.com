/**
 * Adds recent events (from the last few minutes) so active users appear
 * immediately on the dashboard's Real Time page.
 *
 *   node scripts/seed-live.js [siteId] [howMany]
 *
 * Uses the first site if siteId is omitted. Running it again adds more
 * visitors. This script is for local testing only.
 */
require('dotenv').config();
const crypto = require('crypto');
const { db } = require('../src/db');
const Event = require('../src/models/Event');

const siteId = process.argv[2] || db.prepare('SELECT id FROM sites ORDER BY created_at LIMIT 1').get()?.id;
const howMany = Number(process.argv[3]) || 8;

if (!siteId) {
  console.error('No site found. Run `npm run seed` first.');
  process.exit(1);
}

const pages = ['/', '/pricing', '/blog', '/features', '/about', '/contact', '/docs'];
const countries = ['IN', 'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP'];
const devices = ['desktop', 'mobile', 'tablet'];
const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const oses = ['Windows', 'macOS', 'Android', 'iOS', 'Linux'];
const sources = [null, 'google.com', 'twitter.com', 'github.com', 'reddit.com'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

let inserted = 0;
for (let i = 0; i < howMany; i++) {
  const visitorId = crypto.randomBytes(16).toString('hex');
  // Add 1-3 pageviews for each visitor.
  const views = 1 + Math.floor(Math.random() * 3);
  for (let v = 0; v < views; v++) {
    const host = pick(sources);
    Event.create({
      site_id: siteId,
      session_id: visitorId,
      visitor_id: visitorId,
      type: 'pageview',
      url: pick(pages),
      referrer: host ? `https://${host}/` : null,
      referrer_host: host,
      browser: pick(browsers),
      os: pick(oses),
      device: pick(devices),
      country: pick(countries),
      screen: '1920x1080',
      duration: Math.floor(Math.random() * 120),
    });
    inserted++;
  }
}

console.log(`\n✅ Added ${howMany} live visitors (${inserted} pageviews).`);
console.log(`   Site: ${siteId}`);
console.log(`   Refresh the dashboard's Real Time page to see active users!\n`);
