const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_FILE = require('node:path').join(__dirname, '..', 'data', 'test.db');
process.env.DISABLE_RATE_LIMIT = 'true';
const app = require('../src/index');

const email = `t${Date.now()}@example.com`;
const password = 'Str0ngPass23';

test('POST /api/auth/signup creates an account and returns a token', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test User', email, password });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.email, email);
  assert.strictEqual(res.body.user.plan, 'free');
  assert.strictEqual(res.body.user.password, undefined, 'password must never be returned');
});

test('POST /api/auth/signup rejects a duplicate email', async () => {
  const res = await request(app).post('/api/auth/signup').send({ email, password });
  assert.strictEqual(res.status, 409);
});

test('POST /api/auth/signup rejects a short password', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `short${Date.now()}@example.com`, password: '123' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/auth/signup rejects a malformed email', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: 'not-an-email', password });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /valid email/i);
});

test('POST /api/auth/signup rejects a password with no digits', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `nodigit${Date.now()}@example.com`, password: 'abcdefghij' });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /number/i);
});

test('POST /api/auth/signup rejects a common password', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `common${Date.now()}@example.com`, password: 'password123' });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.message, /too common/i);
});

test('POST /api/auth/signup normalises the email and derives a name', async () => {
  const raw = `  MiXeD${Date.now()}@Example.COM  `;
  const res = await request(app).post('/api/auth/signup').send({ email: raw, password });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, raw.trim().toLowerCase());
  assert.ok(res.body.user.name);
});

test('POST /api/auth/signup starts a trial on the free plan', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `trial${Date.now()}@example.com`, password });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.trial.onTrial, true);
  assert.strictEqual(res.body.user.trial.expired, false);
  assert.ok(res.body.user.trial.daysLeft > 0);
  assert.ok(res.body.user.trial.endsAt);
});

test('POST /api/auth/login succeeds with correct credentials', async () => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
});

test('POST /api/auth/login rejects a wrong password', async () => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'nope' });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.message, 'Invalid credentials');
});

test('GET /api/auth/me requires a token', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.strictEqual(res.status, 401);
});

test('GET /api/auth/me returns the current user', async () => {
  const login = await request(app).post('/api/auth/login').send({ email, password });
  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, email);
});

test('PATCH /api/auth/me updates the display name', async () => {
  const login = await request(app).post('/api/auth/login').send({ email, password });
  const res = await request(app)
    .patch('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({ name: '  Renamed   User  ' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.name, 'Renamed User');
});

test('PATCH /api/auth/me rejects an empty name', async () => {
  const login = await request(app).post('/api/auth/login').send({ email, password });
  const res = await request(app)
    .patch('/api/auth/me')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({ name: '   ' });

  assert.strictEqual(res.status, 400);
});

test('password reset flow issues a token and sets a new password', async () => {
  const resetEmail = `reset${Date.now()}@example.com`;
  await request(app).post('/api/auth/signup').send({ email: resetEmail, password });

  const forgot = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: resetEmail });
  assert.strictEqual(forgot.status, 200);
  assert.ok(forgot.body.resetToken, 'dev builds return the token');

  const newPassword = 'BrandNewPw99';
  const reset = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, password: newPassword });
  assert.strictEqual(reset.status, 200);
  assert.ok(reset.body.token);

  const ok = await request(app)
    .post('/api/auth/login')
    .send({ email: resetEmail, password: newPassword });
  assert.strictEqual(ok.status, 200);

  const stale = await request(app)
    .post('/api/auth/login')
    .send({ email: resetEmail, password });
  assert.strictEqual(stale.status, 401, 'the old password must stop working');
});

test('a reset token cannot be used twice', async () => {
  const reuseEmail = `reuse${Date.now()}@example.com`;
  await request(app).post('/api/auth/signup').send({ email: reuseEmail, password });

  const forgot = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: reuseEmail });

  await request(app)
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, password: 'FirstChange11' });

  const second = await request(app)
    .post('/api/auth/reset-password')
    .send({ token: forgot.body.resetToken, password: 'SecondChange22' });

  assert.strictEqual(second.status, 400);
});

test('POST /api/auth/forgot-password hides whether the account exists', async () => {
  const res = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: `ghost${Date.now()}@example.com` });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.resetToken, undefined);
});

test('POST /api/auth/change-password requires the correct current password', async () => {
  const changeEmail = `change${Date.now()}@example.com`;
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ email: changeEmail, password });

  const wrong = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${signup.body.token}`)
    .send({ currentPassword: 'WrongPass11', newPassword: 'Another0ne22' });
  assert.strictEqual(wrong.status, 401);

  const same = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${signup.body.token}`)
    .send({ currentPassword: password, newPassword: password });
  assert.strictEqual(same.status, 400, 'the new password must differ');

  const ok = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${signup.body.token}`)
    .send({ currentPassword: password, newPassword: 'Another0ne22' });
  assert.strictEqual(ok.status, 200);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: changeEmail, password: 'Another0ne22' });
  assert.strictEqual(login.status, 200);
});

test('login is rate limited once the limiter is enabled', async () => {
  const { rateLimit } = require('../src/middleware/rateLimit');
  process.env.DISABLE_RATE_LIMIT = 'false';
  rateLimit.reset();

  try {
    let blocked = false;
    for (let i = 0; i < 12; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'definitely-wrong' });
      if (res.status === 429) {
        blocked = true;
        assert.ok(res.headers['retry-after']);
        break;
      }
    }
    assert.ok(blocked, 'expected a 429 within 12 attempts');
  } finally {
    process.env.DISABLE_RATE_LIMIT = 'true';
    rateLimit.reset();
  }
});