import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db/index.js';
import { PLANS, type Plan } from '../db/schema.js';

export interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  email: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_limit: number;
  usage_count: number;
  usage_reset_at: string;
  created_at: string;
  updated_at: string;
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const key = `snap_${raw}`;
  const prefix = key.slice(0, 12);
  const hash = hashKey(key);
  return { key, prefix, hash };
}

export function createApiKey(name: string, email: string, plan: Plan = 'free'): { apiKey: ApiKey; rawKey: string } {
  const db = getDb();
  const { key, prefix, hash } = generateApiKey();
  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const resetAt = getNextMonthReset().toISOString();

  const stmt = db.prepare(`
    INSERT INTO api_keys (id, key_hash, key_prefix, name, email, plan, monthly_limit, usage_reset_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, hash, prefix, name, email, plan, PLANS[plan].monthlyLimit, resetAt, now, now);

  const apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKey;
  return { apiKey, rawKey: key };
}

export function lookupApiKey(rawKey: string): ApiKey | null {
  const db = getDb();
  const hash = hashKey(rawKey);
  const key = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(hash) as ApiKey | undefined;
  return key ?? null;
}

export function checkAndIncrementUsage(apiKeyId: string): { allowed: boolean; remaining: number; limit: number } {
  const db = getDb();

  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(apiKeyId) as ApiKey;
  if (!key) return { allowed: false, remaining: 0, limit: 0 };

  // Reset usage if past reset date
  if (new Date() > new Date(key.usage_reset_at)) {
    const nextReset = getNextMonthReset().toISOString();
    db.prepare('UPDATE api_keys SET usage_count = 0, usage_reset_at = ?, updated_at = ? WHERE id = ?')
      .run(nextReset, new Date().toISOString(), apiKeyId);
    key.usage_count = 0;
    key.usage_reset_at = nextReset;
  }

  if (key.usage_count >= key.monthly_limit) {
    return { allowed: false, remaining: 0, limit: key.monthly_limit };
  }

  db.prepare('UPDATE api_keys SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), apiKeyId);

  return {
    allowed: true,
    remaining: key.monthly_limit - key.usage_count - 1,
    limit: key.monthly_limit,
  };
}

export function logUsage(apiKeyId: string, endpoint: string, statusCode: number, durationMs: number): void {
  const db = getDb();
  const id = randomBytes(16).toString('hex');
  db.prepare(`
    INSERT INTO usage_logs (id, api_key_id, endpoint, status_code, duration_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, apiKeyId, endpoint, statusCode, durationMs, new Date().toISOString());
}

export function updateApiKeyPlan(apiKeyId: string, plan: Plan, stripeCustomerId?: string, stripeSubscriptionId?: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE api_keys
    SET plan = ?, monthly_limit = ?, stripe_customer_id = COALESCE(?, stripe_customer_id),
        stripe_subscription_id = COALESCE(?, stripe_subscription_id), updated_at = ?
    WHERE id = ?
  `).run(plan, PLANS[plan].monthlyLimit, stripeCustomerId ?? null, stripeSubscriptionId ?? null, new Date().toISOString(), apiKeyId);
}

export function getApiKeyByStripeCustomer(stripeCustomerId: string): ApiKey | null {
  const db = getDb();
  const key = db.prepare('SELECT * FROM api_keys WHERE stripe_customer_id = ?').get(stripeCustomerId) as ApiKey | undefined;
  return key ?? null;
}

function getNextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
