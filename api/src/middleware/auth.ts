import type { Context, Next } from 'hono';
import { lookupApiKey, checkAndIncrementUsage, logUsage, type ApiKey } from '../lib/apiKeys.js';

declare module 'hono' {
  interface ContextVariableMap {
    apiKey: ApiKey;
    usageRemaining: number;
    usageLimit: number;
    requestStart: number;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization');
  const queryKey = c.req.query('api_key');

  const rawKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryKey;

  if (!rawKey) {
    c.res = new Response(JSON.stringify({ error: 'API key required. Pass via Authorization: Bearer <key> or ?api_key=<key>' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    return;
  }

  const apiKey = lookupApiKey(rawKey);
  if (!apiKey) {
    c.res = new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    return;
  }

  const usage = checkAndIncrementUsage(apiKey.id);
  if (!usage.allowed) {
    c.res = new Response(JSON.stringify({
      error: 'Monthly limit exceeded',
      plan: apiKey.plan,
      limit: usage.limit,
      upgrade_url: `${process.env.APP_URL ?? 'https://snapapi.dev'}/pricing`,
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
    return;
  }

  c.set('apiKey', apiKey);
  c.set('usageRemaining', usage.remaining);
  c.set('usageLimit', usage.limit);
  c.set('requestStart', Date.now());

  await next();

  // Log usage after response
  const duration = Date.now() - c.get('requestStart');
  const endpoint = new URL(c.req.url).pathname;
  logUsage(apiKey.id, endpoint, c.res.status, duration);

  // Inject usage headers
  const headers = new Headers(c.res.headers);
  headers.set('X-RateLimit-Limit', String(usage.limit));
  headers.set('X-RateLimit-Remaining', String(usage.remaining));
  c.res = new Response(c.res.body, { status: c.res.status, headers });
}
