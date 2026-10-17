const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test.db');
process.env.DISABLE_RATE_LIMIT = 'true';
const app = require('../src/index');

const email = `n${Date.now()}@example.com`;
const password = 'Str0ngPass23';

let token;

test('setup: signing up seeds a welcome notification', async () => {
  const res = await request(app).post('/api/auth/signup').send({ email, password });
  token = res.body.token;
  assert.ok(token);
});

test('GET /api/notifications requires authentication', async () => {
  const res = await request(app).get('/api/notifications');
  assert.strictEqual(res.status, 401);
});

test('GET /api/notifications returns the welcome notification as unread', async () => {
  const res = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.unread, 1);
  assert.strictEqual(res.body.notifications.length, 1);
  assert.match(res.body.notifications[0].title, /welcome/i);
});

test('creating a site adds a second notification', async () => {
  await request(app)
    .post('/api/sites')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Notif Site', domain: 'notif.example.com' });

  const res = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.body.unread, 2);
  assert.strictEqual(res.body.notifications.length, 2);
});

test('POST /api/notifications/:id/read marks one as read', async () => {
  const list = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);
  const target = list.body.notifications[0];

  const res = await request(app)
    .post(`/api/notifications/${target.id}/read`)
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.unread, 1);
  assert.ok(res.body.notification.read_at);
});

test('POST /api/notifications/read-all clears the badge', async () => {
  const res = await request(app)
    .post('/api/notifications/read-all')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.unread, 0);
});

test('a user cannot read another users notification', async () => {
  const other = await request(app)
    .post('/api/auth/signup')
    .send({ email: `other${Date.now()}@example.com`, password });

  const mine = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);

  const res = await request(app)
    .post(`/api/notifications/${mine.body.notifications[0].id}/read`)
    .set('Authorization', `Bearer ${other.body.token}`);

  assert.strictEqual(res.status, 404);
});

test('DELETE /api/notifications/:id removes it', async () => {
  const list = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);
  const before = list.body.notifications.length;

  const res = await request(app)
    .delete(`/api/notifications/${list.body.notifications[0].id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 204);

  const after = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(after.body.notifications.length, before - 1);
});
