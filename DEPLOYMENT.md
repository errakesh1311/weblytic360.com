# Weblytic360 — Production Deployment Guide (`weblytic360.com`)

This guide explains how to deploy this to **live production**.
Domain: **weblytic360.com**

---

## 🗺️ Architecture (planned deployment)

| URL | Purpose | Hosting |
|-----|------|-----------------|
| `https://weblytic360.com` | Frontend (landing + dashboard) | **Vercel** |
| `https://api.weblytic360.com` | Backend API | **Render** or **Railway** |
| Database | Postgres (production) or SQLite (low traffic) | Render/Railway managed DB |

---

## ✅ Overall Checklist (6 Steps)

- [ ] **Step 1 — Email delivery** (Resend/SMTP) — password resets, invitations, and welcome emails
- [ ] **Step 2 — Stripe billing** (checkout + webhook) — accept payments
- [ ] **Step 3 — Production database** (Postgres optional)
- [ ] **Step 4 — Security & env config** (secrets, CORS, HTTPS)
- [ ] **Step 5 — Deployment** (Vercel + Render)
- [ ] **Step 6 — Connect the domain** (DNS records)

> We will complete these steps **one at a time**. The code is ready so far (72/72 tests pass).

---

## 🔑 Step 4 — Production Environment Variables

### Backend (`api.weblytic360.com`)

```bash
NODE_ENV=production
PORT=5000

# Security — required; use a strong random value
JWT_SECRET=<generate: openssl rand -hex 32>
JWT_EXPIRES_IN=7d

# Allow requests from the frontend
CORS_ORIGIN=https://weblytic360.com

# Database (if using Postgres)
DATABASE_URL=postgres://user:pass@host:5432/weblytic360
# To use SQLite, set DB_FILE
# DB_FILE=/data/weblytic360.db

# Stripe (from Step 2)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (from Step 1)
EMAIL_FROM="Weblytic360 <no-reply@weblytic360.com>"
RESEND_API_KEY=re_xxx

# Trial period
TRIAL_DAYS=14

# Public app URL (for password reset links and emails)
APP_URL=https://weblytic360.com
```

### Frontend (Vercel env)

```bash
NEXT_PUBLIC_API_URL=https://api.weblytic360.com
```

---

## 🌐 Step 6 — DNS Records (at your domain provider)

| Type | Name | Value | Purpose |
|------|------|-------|------|
| A / CNAME | `@` (weblytic360.com) | Provided by Vercel | Frontend |
| CNAME | `www` | `cname.vercel-dns.com` | www redirect |
| CNAME | `api` | Render/Railway ka URL | Backend API |
| TXT | (email verification) | Provided by Resend/email provider | For sending email |

> Vercel and Render will provide the exact values during deployment.

---

## 🚀 Step 5 — Deploy Commands (reference)

### Frontend → Vercel
1. Push the repository to GitHub.
2. Go to vercel.com → New Project → import the repository → root = `frontend/`
3. Env var: `NEXT_PUBLIC_API_URL=https://api.weblytic360.com`
4. Deploy, then add the `weblytic360.com` domain.

### Backend → Render
1. Go to render.com → New Web Service → select the repository → root = `backend/`
2. Build: `npm install` | Start: `npm start`
3. Add all backend environment variables listed above.
4. Set the custom domain to `api.weblytic360.com`.

---

## 📌 What to do next

We will start with **Step 1 (Email)**. We will check off the remaining steps in this guide as we complete them.
