# Weblytic360

Privacy-friendly, cookie-less web analytics SaaS - a self-hostable alternative to
Publytics / Plausible / Fathom.

- **Backend** - Express + SQLite (`node:sqlite`, no native build step)
- **Frontend** - Next.js dashboard, zero chart dependencies (hand-rolled SVG)
- **Tracker** - ~1 KB script, no cookies, no personal data stored

---

## Requirements

- **Node.js 22.5+** (required for the built-in `node:sqlite` module)

Check with `node -v`.

---

## Quick start

### 1. Backend

```powershell
cd backend
npm install
npm run seed     # creates a demo account with ~30 days of traffic
npm run dev      # http://localhost:5000
```

### 2. Frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:3000
```

### 3. Log in

Open http://localhost:3000/login

| Email | Password |
|---|---|
| `demo@weblytic360.com` | `demo1234` |

---

## Tracking a real site

Add this before `</body>` on any page you want to measure:

```html
<script defer src="http://localhost:3000/tracker.js"
        data-site-id="YOUR_SITE_ID"
        data-api="http://localhost:5000"></script>
```

Your site id is shown on the **Settings** page of each site in the dashboard.

Track a custom event from your own code:

```js
weblytic360.track('signup', { plan: 'pro' });
```

---

## Configuration

`backend/.env`

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `JWT_SECRET` | dev value | **Change in production** |
| `DB_FILE` | `backend/data/weblytic360.db` | SQLite file |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed dashboard origin |
| `STRIPE_SECRET_KEY` | empty | Leave empty to switch plans without payment |

`frontend/.env.local`

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` |
| `NEXT_PUBLIC_TRACKER_URL` | `http://localhost:3000/tracker.js` |

---

## API

All dashboard routes need `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Returns a JWT |
| `GET`  | `/api/auth/me` | Current user |
| `PATCH`| `/api/auth/me` | Update the display name |
| `POST` | `/api/auth/change-password` | Change password (needs the current one) |
| `POST` | `/api/auth/forgot-password` | **Public** - issues a reset token |
| `POST` | `/api/auth/reset-password` | **Public** - consumes a reset token |
| `GET`  | `/api/sites` | List sites |
| `POST` | `/api/sites` | Create a site (plan limited) |
| `PUT`/`DELETE` | `/api/sites/:siteId` | Update / delete |
| `POST` | `/api/events/collect` | **Public** - tracker ingest |
| `GET`  | `/api/stats/:siteId` | Everything the dashboard needs |
| `GET`  | `/api/stats/:siteId/overview` | KPIs + period-over-period change |
| `GET`  | `/api/stats/:siteId/timeseries` | `?unit=day\|hour` |
| `GET`  | `/api/stats/:siteId/metrics` | `?type=url\|referrer\|browser\|os\|device\|country\|screen\|event\|utm_source\|utm_medium\|utm_campaign` |
| `GET`  | `/api/stats/:siteId/active` | Visitors in the last 5 minutes |
| `GET`  | `/api/billing/plans` | **Public** - pricing table |
| `GET`  | `/api/billing/usage` | Quota usage this month |
| `POST` | `/api/billing/subscribe` | Change plan |

Common query params: `?days=7` or `?start=<iso>&end=<iso>`, plus `&limit=`.

### Account security

- **Password rules** - at least 8 characters, with one letter and one digit.
  A short list of very common passwords is rejected outright.
- **Rate limiting** - in-memory, per IP: 10 logins / 15 min, 5 signups / hour,
  5 password-reset requests / hour. Set `DISABLE_RATE_LIMIT=true` to turn it off
  (the test suite does this). Running several API instances? Move the counters in
  `src/middleware/rateLimit.js` to Redis so they are shared.
- **Reset tokens** - random 32 bytes, stored only as a SHA-256 hash, valid for
  one hour and cleared as soon as they are used.
- **No account enumeration** - `/forgot-password` returns the same 200 response
  whether or not the email exists. Outside production it also returns
  `resetToken` and logs the reset URL, because no email provider is wired up yet.

---

## Privacy

- No cookies and no `localStorage` on tracked sites.
- Visitor ids are a salted SHA-256 of IP + user agent + date. The salt is
  regenerated on every restart and raw IPs are never written to disk, so
  visitors cannot be tracked across days or across sites.
- Obvious bots and crawlers are discarded at ingest.

---

## Plans

| Plan | Price | Events / month | Sites |
|---|---|---|---|
| Free | $0 | 10,000 | 1 |
| Pro | $19 | 500,000 | 10 |
| Business | $79 | 5,000,000 | 100 |

With `STRIPE_SECRET_KEY` unset, `POST /api/billing/subscribe` switches plans
immediately so you can test quotas without payment.

---

## Notes for contributors

`.npmrc` files are gitignored because they may point at a private registry
mirror. If `npm install` fails with a 503, set your registry explicitly:

```powershell
npm config set registry <your-registry-url>
```

## Licence

MIT