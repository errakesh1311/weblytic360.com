require('dotenv').config();
const path = require('path');

const config = {
  PORT: process.env.PORT || 5000,
  DB_FILE: process.env.DB_FILE || path.join(__dirname, '..', '..', 'data', 'weblytic360.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  TRIAL_DAYS: Number(process.env.TRIAL_DAYS || 14),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Weblytic360 <noreply@weblytic360.com>',
  PLANS: {
    free: { name: 'Free', priceMonthly: 0, eventLimit: 10000, siteLimit: 1 },
    pro: { name: 'Pro', priceMonthly: 19, eventLimit: 500000, siteLimit: 10 },
    business: { name: 'Business', priceMonthly: 79, eventLimit: 5000000, siteLimit: 100 },
  },
};

module.exports = config;