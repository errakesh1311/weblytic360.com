const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test.db');
process.env.DISABLE_RATE_LIMIT = 'true';
const app = require('../src/index');

const email = `s${Date.now()}@example.com`;
const password = 'Str0ngPass23';

let token;
let siteId;

test('setup: create an account, a site and one tracked pageview', async () => {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Stats User', email, password });
  token = signup.body.token;
  assert.ok(token);

  const site = await request(app)
    .post('/api/sites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Stats Site', domain: 'https://stats.example.com/' });

  assert.strictEqual(site.status, 201);
  assert.strictEqual(site.body.domain, 'stats.example.com', 'domain should be normalised');
  siteId = site.body.id;

  const collected = await request(app)
    .post('/api/events/collect')
    .send({ siteId, url: 'https://stats.example.com/pricing', referrer: 'https://google.com/' });

  assert.strictEqual(collected.status, 201);
});

test('POST /api/events/collect ignores bot traffic', async () => {
  const res = await request(app)
    .post('/api/events/collect')
    .set('User-Agent', 'Googlebot/2.1')
    .send({ siteId, url: 'https://stats.example.com/' });

  assert.strictEqual(res.status, 202);
  assert.strictEqual(res.body.ignored, 'bot');
});

test('POST /api/events/collect rejects an unknown site', async () => {
  const res = await request(app)
    .post('/api/events/collect')
    .send({ siteId: 'does-not-exist', url: 'https://x.com/' });
  assert.strictEqual(res.status, 404);
});

test('GET /api/stats/:siteId/overview returns the tracked pageview', async () => {
  const res = await request(app)
    .get(`/api/stats/${siteId}/overview?days=1`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.pageviews, 1);
  assert.strictEqual(res.body.visitors, 1);
  assert.ok(res.body.change, 'should include period-over-period change');
});

test('GET /api/stats/:siteId/metrics returns the referrer breakdown', async () => {
  const res = await request(app)
    .get(`/api/stats/${siteId}/metrics?type=referrer&days=1`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.some((r) => r.x === 'google.com'));
});

test('GET /api/stats/:siteId/metrics rejects an unsupported type', async () => {
  const res = await request(app)
    .get(`/api/stats/${siteId}/metrics?type=;DROP TABLE events`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 400);
});

test('GET /api/stats/:siteId/active reports live visitors', async () => {
  const res = await request(app)
    .get(`/api/stats/${siteId}/active`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.visitors, 1);
});

test('stats require authentication', async () => {
  const res = await request(app).get(`/api/stats/${siteId}/overview`);
  assert.strictEqual(res.status, 401);
});

test('a user cannot read another users site', async () => {
  const other = await request(app)
    .post('/api/auth/signup')
    .send({ email: `other${Date.now()}@example.com`, password });

  const res = await request(app)
    .get(`/api/stats/${siteId}/overview`)
    .set('Authorization', `Bearer ${other.body.token}`);

  assert.strictEqual(res.status, 404, 'must not leak another tenants data');
});

test('free plan allows only one site', async () => {
  const res = await request(app)
    .post('/api/sites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Second', domain: 'second.example.com' });

  assert.strictEqual(res.status, 402);
});

/* ------------------------------------------------------------------ */
/* AI traffic                                                          */
/* ------------------------------------------------------------------ */

test('POST /api/events/collect tags an AI assistant referral', async () => {
  const res = await request(app)
    .post('/api/events/collect')
    .send({ siteId, url: 'https://stats.example.com/docs', referrer: 'https://chatgpt.com/' });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.ai, 'ChatGPT');
});

test('POST /api/events/collect records AI crawlers instead of dropping them as bots', async () => {
  const res = await request(app)
    .post('/api/events/collect')
    .set('User-Agent', 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)')
    .send({ siteId, url: 'https://stats.example.com/blog' });

  assert.strictEqual(res.status, 201, 'AI crawlers must not be filtered out as generic bots');
  assert.strictEqual(res.body.ai, 'GPTBot');
});

test('GET /api/stats/:siteId/ai summarises assistant and crawler traffic', async () => {
  const res = await request(app)
    .get(`/api/stats/${siteId}/ai?days=1`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.totals.referrals, 1);
  assert.strictEqual(res.body.totals.crawls, 1);
  assert.strictEqual(res.body.totals.hits, 2);

  const sources = res.body.sources.map((r) => r.x);
  assert.ok(sources.includes('ChatGPT'), 'ChatGPT referral should appear in the breakdown');
  assert.ok(sources.includes('GPTBot'), 'GPTBot crawl should appear in the breakdown');
  assert.ok(res.body.share > 0, 'AI traffic should be a non-zero share of all traffic');
});

test('GET /api/stats/:siteId/ai requires authentication', async () => {
  const res = await request(app).get(`/api/stats/${siteId}/ai`);
  assert.strictEqual(res.status, 401);
});

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

test('GET /api/stats/network combines every site the user owns', async () => {
  const res = await request(app)
    .get('/api/stats/network?days=30')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.ok(res.body.siteCount >= 1);
  assert.ok(Array.isArray(res.body.sites));
  assert.ok(res.body.totals.pageviews >= 1, 'combined pageviews should include our tracked hits');
  assert.ok(
    res.body.sites.some((s) => s.id === siteId),
    'the network view should list the test site'
  );
});

test('GET /api/stats/network requires authentication', async () => {
  const res = await request(app).get('/api/stats/network');
  assert.strictEqual(res.status, 401);
});
