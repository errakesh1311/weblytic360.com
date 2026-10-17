const express = require('express');
const cors = require('cors');
const config = require('./config');
const { init } = require('./db');
const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/sites');
const eventRoutes = require('./routes/events');
const statsRoutes = require('./routes/stats');
const billingRoutes = require('./routes/billing');
const notificationRoutes = require('./routes/notifications');
const teamRoutes = require('./routes/team');
const apiKeyRoutes = require('./routes/apiKeys');
const importRoutes = require('./routes/imports');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Required for correct client IPs (rate limiting, visitor hashing) when the API
// runs behind a reverse proxy or load balancer.
app.set('trust proxy', 1);

app.use(cors({ origin: config.CORS_ORIGIN }));

// Stripe webhooks need the raw, unparsed body to verify the signature, so this
// route is registered BEFORE express.json() takes over body parsing.
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const { handleWebhook } = require('./services/stripe');
      const event = await handleWebhook(req.body, req.headers['stripe-signature']);
      res.json({ received: true, type: event.type });
    } catch (error) {
      console.error('[stripe] webhook error:', error.message);
      res.status(400).json({ message: `Webhook error: ${error.message}` });
    }
  }
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) =>
  res.json({ ok: true, service: 'weblytic360-api', time: new Date().toISOString() })
);

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/imports', importRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

init();

// Only bind a port when run directly, so tests can import the app.
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`Weblytic360 API listening on http://localhost:${config.PORT}`);
  });
}

module.exports = app;