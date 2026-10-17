const express = require('express');
const config = require('../config');
const User = require('../models/User');
const Event = require('../models/Event');
const Site = require('../models/Site');
const { protect } = require('../middleware/auth');

const router = express.Router();

/** Public pricing table. */
router.get('/plans', (req, res) => {
  res.json(
    Object.entries(config.PLANS).map(([id, plan]) => ({ id, ...plan }))
  );
});

router.use(protect);

/** Current subscription + usage against the plan quota. */
router.get('/usage', (req, res, next) => {
  try {
    const plan = config.PLANS[req.user.plan] || config.PLANS.free;
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    const events = Event.countByUserSince(req.user.id, periodStart.toISOString());

    res.json({
      plan: { id: req.user.plan, ...plan },
      trial: User.trialStatus(req.user),
      periodStart: periodStart.toISOString(),
      usage: {
        events,
        eventLimit: plan.eventLimit,
        eventPercent: Math.min(100, Math.round((events / plan.eventLimit) * 100)),
        sites: Site.countByUser(req.user.id),
        siteLimit: plan.siteLimit,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Change plan. Without STRIPE_SECRET_KEY configured this switches the plan
 * directly, which is what you want in development.
 */
router.post('/subscribe', (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!config.PLANS[planId]) {
      return res.status(400).json({ message: 'Unknown plan' });
    }

    if (config.STRIPE_SECRET_KEY) {
      const { createCheckoutSession } = require('../services/stripe');
      return createCheckoutSession(req.user, planId).then((url) => res.json({ url }));
    }

    const user = User.updatePlan(req.user.id, planId);
    res.json({ user, message: `Switched to ${planId} plan (dev mode, no payment)` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;