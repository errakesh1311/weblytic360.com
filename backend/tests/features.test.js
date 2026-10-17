const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test.db');
process.env.DISABLE_RATE_LIMIT = 'true';
const app = require('../src/index');

const email = `features${Date.now()}@example.com`;
const password = 'Str0ngPass23';
let token;
let siteId;
let keyId;

test('setup: signup and create a site', async () => {
  const signup = await request(app).post('/api/auth/signup').send({ email, password });
  token = signup.body.token;
  assert.ok(token);

  const site = await request(app)
    .post('/api/sites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'My Site', domain: 'example.com' });
  siteId = site.body.id;
  assert.ok(siteId);
});

// ---- Preferences ----
test('signup response includes default preferences', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.body.user.preferences.darkMode, false);
  assert.strictEqual(res.body.user.preferences.timezone, 'UTC');
  assert.strictEqual(res.body.user.preferences.weekStartsOn, 'monday');
});

test('PATCH /api/auth/preferences updates settings', async () => {
  const res = await request(app)
    .patch('/api/auth/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send({ darkMode: true, timezone: 'Asia/Kolkata', weekStartsOn: 'sunday' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.preferences.darkMode, true);
  assert.strictEqual(res.body.user.preferences.timezone, 'Asia/Kolkata');
  assert.strictEqual(res.body.user.preferences.weekStartsOn, 'sunday');
});

test('PATCH /api/auth/preferences rejects a bad week start', async () => {
  const res = await request(app)
    .patch('/api/auth/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send({ weekStartsOn: 'tuesday' });
  assert.strictEqual(res.status, 400);
});

// ---- API keys ----
test('POST /api/keys creates a key and returns the secret once', async () => {
  const res = await request(app)
    .post('/api/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'CI key', scope: 'write' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.secret.startsWith('w360_'));
  assert.strictEqual(res.body.key.scope, 'write');
  keyId = res.body.key.id;
});

test('GET /api/keys never returns the secret', async () => {
  const res = await request(app).get('/api/keys').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.keys.length, 1);
  assert.ok(!('secret' in res.body.keys[0]));
});

test('POST /api/keys/:id/revoke disables the key', async () => {
  const res = await request(app)
    .post(`/api/keys/${keyId}/revoke`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.key.revokedAt);
});

test('POST /api/keys rejects a missing name', async () => {
  const res = await request(app)
    .post('/api/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ scope: 'read' });
  assert.strictEqual(res.status, 400);
});

// ---- Imports ----
test('POST /api/imports imports CSV rows as events', async () => {
  const csv = [
    'url,type,browser,country',
    '/home,pageview,Chrome,US',
    '/about,pageview,Safari,GB',
  ].join('\n');

  const res = await request(app)
    .post('/api/imports')
    .set('Authorization', `Bearer ${token}`)
    .send({ siteId, filename: 'test.csv', csv });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.job.status, 'completed');
  assert.strictEqual(res.body.job.importedRows, 2);
});

test('POST /api/imports rejects CSV without a url column', async () => {
  const res = await request(app)
    .post('/api/imports')
    .set('Authorization', `Bearer ${token}`)
    .send({ siteId, csv: 'foo,bar\n1,2' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/imports rejects a foreign site', async () => {
  const res = await request(app)
    .post('/api/imports')
    .set('Authorization', `Bearer ${token}`)
    .send({ siteId: 'does-not-exist', csv: 'url\n/x' });
  assert.strictEqual(res.status, 404);
});

test('GET /api/imports lists completed jobs', async () => {
  const res = await request(app).get('/api/imports').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.jobs.length >= 1);
});
