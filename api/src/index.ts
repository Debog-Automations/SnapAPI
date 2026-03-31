import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { authMiddleware } from './middleware/auth.js';
import screenshotRoute from './routes/screenshot.js';
import ogImageRoute from './routes/ogImage.js';
import keysRoute from './routes/keys.js';
import billingRoute from './routes/billing.js';
import { closeBrowser } from './lib/browser.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}));
app.use('*', secureHeaders());

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// Stripe webhook (no auth, raw body needed)
app.post('/v1/billing/webhook', async (c) => {
  const { default: billingApp } = await import('./routes/billing.js');
  return billingApp.fetch(c.req.raw);
});

// Protected routes — auth middleware registered before route handlers
app.use('/v1/screenshot', authMiddleware);
app.use('/v1/og-image', authMiddleware);
app.use('/v1/billing/checkout', authMiddleware);

app.route('/v1/screenshot', screenshotRoute);
app.route('/v1/og-image', ogImageRoute);
app.route('/v1/billing', billingRoute);

// Keys: /create is public, /me requires auth (middleware applied inside keysRoute)
app.route('/v1/keys', keysRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT ?? '3000', 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`SnapAPI running on http://localhost:${info.port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeBrowser();
  server.close();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await closeBrowser();
  server.close();
  process.exit(0);
});

export default app;
