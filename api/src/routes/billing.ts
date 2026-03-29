import { Hono } from 'hono';
import Stripe from 'stripe';
import { updateApiKeyPlan, getApiKeyByStripeCustomer } from '../lib/apiKeys.js';
import type { Plan } from '../db/schema.js';

const app = new Hono();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

const PRICE_TO_PLAN: Record<string, Plan> = {};

function getPriceMap(): Record<string, Plan> {
  if (process.env.STRIPE_STARTER_PRICE_ID) {
    PRICE_TO_PLAN[process.env.STRIPE_STARTER_PRICE_ID] = 'starter';
  }
  if (process.env.STRIPE_PRO_PRICE_ID) {
    PRICE_TO_PLAN[process.env.STRIPE_PRO_PRICE_ID] = 'pro';
  }
  return PRICE_TO_PLAN;
}

// Create a Stripe checkout session for upgrading
app.post('/checkout', async (c) => {
  const apiKey = c.get('apiKey');
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const plan = body.plan as string;
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!['starter', 'pro'].includes(plan)) {
    return c.json({ error: 'plan must be "starter" or "pro"' }, 400);
  }
  if (!starterPriceId || !proPriceId) {
    return c.json({ error: 'Billing not configured' }, 503);
  }

  const priceId = plan === 'starter' ? starterPriceId : proPriceId;
  const stripe = getStripe();
  const appUrl = process.env.APP_URL ?? 'https://snapapi.dev';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: apiKey.email,
      metadata: { api_key_id: apiKey.id },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
    });

    return c.json({ checkout_url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return c.json({ error: message }, 500);
  }
});

// Stripe webhook handler
app.post('/webhook', async (c) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return c.json({ error: 'Webhook secret not configured' }, 503);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  const rawBody = await c.req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook verification failed';
    return c.json({ error: message }, 400);
  }

  const priceMap = getPriceMap();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const apiKeyId = session.metadata?.api_key_id;
      if (!apiKeyId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? priceMap[priceId] : undefined;

      if (plan) {
        updateApiKeyPlan(apiKeyId, plan, session.customer as string, session.subscription as string);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const apiKey = getApiKeyByStripeCustomer(subscription.customer as string);
      if (apiKey) {
        updateApiKeyPlan(apiKey.id, 'free');
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? priceMap[priceId] : undefined;

      if (plan) {
        const apiKey = getApiKeyByStripeCustomer(subscription.customer as string);
        if (apiKey) {
          updateApiKeyPlan(apiKey.id, plan, undefined, subscription.id);
        }
      }
      break;
    }
  }

  return c.json({ received: true });
});

export default app;
