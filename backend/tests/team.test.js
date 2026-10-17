const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test.db');
process.env.DISABLE_RATE_LIMIT = 'true';
const app = require('../src/index');

const email = `owner${Date.now()}@example.com`;
const password = 'Str0ngPass23';
let token;
let memberId;

test('setup: create the workspace owner', async () => {
  const res = await request(app).post('/api/auth/signup').send({ email, password });
  token = res.body.token;
  assert.ok(token);
});

test('GET /api/team requires authentication', async () => {
  const res = await request(app).get('/api/team');
  assert.strictEqual(res.status, 401);
});

test('GET /api/team starts empty with the role list', async () => {
  const res = await request(app).get('/api/team').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.members, []);
  assert.ok(res.body.roles.includes('viewer'));
});

test('POST /api/team invites a member', async () => {
  const res = await request(app)
    .post('/api/team')
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'mate@example.com', name: 'Team Mate', role: 'editor' });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.member.email, 'mate@example.com');
  assert.strictEqual(res.body.member.role, 'editor');
  assert.strictEqual(res.body.member.status, 'invited');
  memberId = res.body.member.id;
});

test('POST /api/team rejects a bad email', async () => {
  const res = await request(app)
    .post('/api/team')
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'nope', role: 'viewer' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/team rejects an unknown role', async () => {
  const res = await request(app)
    .post('/api/team')
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'x@example.com', role: 'superadmin' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/team rejects a duplicate invite', async () => {
  const res = await request(app)
    .post('/api/team')
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'mate@example.com', role: 'viewer' });
  assert.strictEqual(res.status, 409);
});

test('PATCH /api/team/:id changes the role', async () => {
  const res = await request(app)
    .patch(`/api/team/${memberId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ role: 'admin' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.member.role, 'admin');
});

test('a user cannot touch another workspace member', async () => {
  const other = await request(app)
    .post('/api/auth/signup')
    .send({ email: `intruder${Date.now()}@example.com`, password });

  const res = await request(app)
    .patch(`/api/team/${memberId}`)
    .set('Authorization', `Bearer ${other.body.token}`)
    .send({ role: 'viewer' });
  assert.strictEqual(res.status, 404);
});

test('DELETE /api/team/:id removes the member', async () => {
  const res = await request(app)
    .delete(`/api/team/${memberId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.status, 204);

  const list = await request(app).get('/api/team').set('Authorization', `Bearer ${token}`);
  assert.strictEqual(list.body.members.length, 0);
});
