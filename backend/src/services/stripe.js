const config = require('../config');

const stripe = config.STRIPE_SECRET_KEY
  ? require('stripe')(config.STRIPE_SECRET_KEY)
  : null;

const FRONTEND_URL = config.FRONTEND_URL || 'http://localhost:3000';

/** Creates a Stripe Checkout session and returns its URL. */
const createCheckoutSession = async (user, planId) => {
  if (!stripe) throw new Error('Stripe is not configured');

  const plan = config.PLANS[planId];
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: plan.priceMonthly * 100,
          recurring: { interval: 'month' },
          product_data: { name: `Weblytic360 ${plan.name}` },
        },
      },
    ],
    metadata: { userId: user.id, planId },
    success_url: `${FRONTEND_URL}/settings?checkout=success`,
    cancel_url: `${FRONTEND_URL}/pricing?checkout=cancelled`,
  });

  return session.url;
};

/** Verifies and processes an incoming Stripe webhook. */
const handleWebhook = async (rawBody, signature) => {
  if (!stripe) throw new Error('Stripe is not configured');

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.STRIPE_WEBHOOK_SECRET
  );

  const User = require('../models/User');

  switch (event.type) {
    case 'checkout.session.completed': {
      const { userId, planId } = event.data.object.metadata || {};
      if (userId && planId) User.updatePlan(userId, planId);
      break;
    }
    case 'customer.subscription.deleted': {
      // Subscription ended / cancelled → drop the user back to the free plan.
      const { userId } = event.data.object.metadata || {};
      if (userId) User.updatePlan(userId, 'free');
      break;
    }
    default:
      break;
  }

  return event;
};

module.exports = { stripe, createCheckoutSession, handleWebhook };