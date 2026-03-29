import { Hono } from 'hono';
import { createApiKey } from '../lib/apiKeys.js';
import { PLANS } from '../db/schema.js';
import { getDb } from '../db/index.js';

const app = new Hono();

// Create a new API key (sign-up endpoint)
app.post('/create', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const name = body.name as string;
  const email = body.email as string;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 400);
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return c.json({ error: 'valid email is required' }, 400);
  }

  // Check if email already has a key
  const db = getDb();
  const existing = db.prepare('SELECT id FROM api_keys WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return c.json({ error: 'An API key already exists for this email' }, 409);
  }

  const { apiKey, rawKey } = createApiKey(name.trim(), email.toLowerCase().trim(), 'free');

  return c.json({
    message: 'API key created. Store it safely — it will not be shown again.',
    api_key: rawKey,
    key_prefix: apiKey.key_prefix,
    plan: apiKey.plan,
    monthly_limit: apiKey.monthly_limit,
  }, 201);
});

// Get current key info (requires auth)
app.get('/me', async (c) => {
  const apiKey = c.get('apiKey');
  const db = getDb();

  const usageLogs = db.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE api_key_id = ? AND created_at >= date('now', 'start of month')
  `).get(apiKey.id) as { count: number };

  return c.json({
    key_prefix: apiKey.key_prefix,
    name: apiKey.name,
    email: apiKey.email,
    plan: apiKey.plan,
    plan_details: PLANS[apiKey.plan],
    monthly_limit: apiKey.monthly_limit,
    usage_this_month: usageLogs.count,
    usage_reset_at: apiKey.usage_reset_at,
    created_at: apiKey.created_at,
  });
});

export default app;
