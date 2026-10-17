/**
 * Seeds a demo account with a site and ~30 days of realistic traffic.
 * Usage: npm run seed
 */
const crypto = require('crypto');
const { init, db } = require('../src/db');
const User = require('../src/models/User');
const Site = require('../src/models/Site');
const Event = require('../src/models/Event');

const DEMO_EMAIL = 'demo@weblytic360.com';
const DEMO_PASSWORD = 'demo1234';

const PAGES = ['/', '/pricing', '/blog', '/blog/analytics-101', '/docs', '/contact', '/about'];
const REFERRERS = [
  'google.com', 'bing.com', 'x.com', 'linkedin.com',
  'news.ycombinator.com', 'reddit.com', null, null, null,
];
const BROWSERS = ['Chrome', 'Chrome', 'Chrome', 'Safari', 'Firefox', 'Edge'];
const OSES = ['Windows', 'macOS', 'iOS', 'Android', 'Linux'];
const COUNTRIES = ['IN', 'US', 'GB', 'DE', 'CA', 'AU', 'SG'];
const DEVICES = ['desktop', 'desktop', 'mobile', 'mobile', 'tablet'];

// AI assistants that send real people, weighted roughly by market share.
const AI_ASSISTANTS = [
  { host: 'chatgpt.com', source: 'ChatGPT', vendor: 'OpenAI', weight: 10 },
  { host: 'perplexity.ai', source: 'Perplexity', vendor: 'Perplexity', weight: 5 },
  { host: 'claude.ai', source: 'Claude', vendor: 'Anthropic', weight: 4 },
  { host: 'gemini.google.com', source: 'Gemini', vendor: 'Google', weight: 3 },
  { host: 'copilot.microsoft.com', source: 'Copilot', vendor: 'Microsoft', weight: 2 },
  { host: 'grok.com', source: 'Grok', vendor: 'xAI', weight: 1 },
  { host: 'deepseek.com', source: 'DeepSeek', vendor: 'DeepSeek', weight: 1 },
];

// Bots that fetch pages for training or citation.
const AI_BOTS = [
  { source: 'GPTBot', vendor: 'OpenAI', weight: 8 },
  { source: 'ClaudeBot', vendor: 'Anthropic', weight: 6 },
  { source: 'PerplexityBot', vendor: 'Perplexity', weight: 4 },
  { source: 'Google-Extended', vendor: 'Google', weight: 3 },
  { source: 'Bytespider', vendor: 'ByteDance', weight: 3 },
  { source: 'CCBot', vendor: 'Common Crawl', weight: 2 },
  { source: 'Amazonbot', vendor: 'Amazon', weight: 1 },
  { source: 'Applebot-Extended', vendor: 'Apple', weight: 1 },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Picks an entry honouring its `weight`. */
function pickWeighted(list) {
  const total = list.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of list) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return list[list.length - 1];
}

async function main() {
  init();

  let user = User.findByEmail(DEMO_EMAIL);
  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      plan: 'pro',
    });
    console.log(`Created demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  let site = Site.findByUser(user.id)[0];
  if (!site) {
    site = Site.create({ userId: user.id, name: 'Demo Site', domain: 'demo.weblytic360.com' });
    console.log(`Created demo site ${site.id}`);
  }

  const existing = db
    .prepare('SELECT COUNT(*) AS c FROM events WHERE site_id = ?')
    .get(site.id).c;
  if (existing > 0) {
    console.log(`Site already has ${existing} events, skipping generation.`);
    return printSummary(site);
  }
  const insertAll = () => {
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      // More traffic on recent days, less on weekends.
      const date = new Date(Date.now() - dayOffset * 86400000);
      const weekend = [0, 6].includes(date.getUTCDay());
      const sessions = randInt(weekend ? 15 : 40, weekend ? 40 : 110);      for (let s = 0; s < sessions; s++) {
        const sessionId = crypto.randomUUID();
        const visitorId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
        const browser = pick(BROWSERS);
        const os = pick(OSES);
        const device = pick(DEVICES);
        const country = pick(COUNTRIES);

        // AI referrals grow from ~4% of sessions a month ago to ~14% today.
        const aiChance = 0.04 + ((29 - dayOffset) / 29) * 0.10;
        const assistant = Math.random() < aiChance ? pickWeighted(AI_ASSISTANTS) : null;
        const referrerHost = assistant ? assistant.host : pick(REFERRERS);
        const views = Math.random() < 0.45 ? 1 : randInt(2, 6); // ~45% bounce

        for (let v = 0; v < views; v++) {
          const ts = new Date(date);
          ts.setUTCHours(randInt(6, 22), randInt(0, 59), randInt(0, 59));

          const row = {
            id: crypto.randomUUID(),
            site_id: site.id,
            session_id: sessionId,
            visitor_id: visitorId,
            type: 'pageview',
            name: null,
            url: v === 0 ? pick(PAGES) : pick(PAGES),
            referrer: v === 0 && referrerHost ? `https://${referrerHost}/` : null,
            referrer_host: v === 0 ? referrerHost : null,
            utm_source: referrerHost === 'x.com' ? 'twitter' : null,
            utm_medium: referrerHost === 'x.com' ? 'social' : null,
            utm_campaign: referrerHost === 'x.com' ? 'launch' : null,
            browser,
            os,
            device,
            country,
            screen: device === 'mobile' ? '390x844' : '1920x1080',
            duration: randInt(5, 240),
            props: null,
            ai_source: assistant && v === 0 ? assistant.source : null,
            ai_vendor: assistant && v === 0 ? assistant.vendor : null,
            ai_kind: assistant && v === 0 ? 'referral' : null,
            created_at: ts.toISOString(),
          };
          db.prepare(Event.INSERT_SQL).run(...Event.toValues(row));
        }

        // A few conversions per day.
        if (Math.random() < 0.08) {
          Event.create({
            site_id: site.id,
            session_id: sessionId,
            visitor_id: visitorId,
            type: 'custom',
            name: pick(['signup', 'newsletter', 'demo_request']),
            url: '/pricing',
            browser,
            os,
            device,            country,
          });
        }      }

      // AI crawlers sweep the site independently of human sessions.
      const crawls = randInt(8, 30);
      for (let c = 0; c < crawls; c++) {
        const bot = pickWeighted(AI_BOTS);
        const ts = new Date(date);
        ts.setUTCHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));
        const botId = `bot-${bot.source.toLowerCase()}`;

        db.prepare(Event.INSERT_SQL).run(
          ...Event.toValues({
            id: crypto.randomUUID(),
            site_id: site.id,
            session_id: `${botId}-${date.toISOString().slice(0, 10)}`,
            visitor_id: botId,
            type: 'pageview',
            url: pick(PAGES),
            browser: 'Other',
            os: 'Other',
            device: 'bot',
            duration: 0,
            ai_source: bot.source,
            ai_vendor: bot.vendor,
            ai_kind: 'crawler',
            created_at: ts.toISOString(),
          })
        );
      }
    }
  };

  db.exec('BEGIN');
  try {
    insertAll();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  printSummary(site);
}

function printSummary(site) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM events WHERE site_id = ?').get(site.id);
  console.log('\n--- Seed complete ---');
  console.log(`Login:   ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Site ID: ${site.id}`);
  console.log(`Events:  ${c}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
