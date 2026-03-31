import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!name) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'valid email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawKey = 'snap_' + randomBytes(20).toString('hex');
  const keyPrefix = rawKey.slice(0, 12);

  return new Response(
    JSON.stringify({
      message: 'API key created. Store it safely — it will not be shown again.',
      api_key: rawKey,
      key_prefix: keyPrefix,
      plan: 'free',
      monthly_limit: 100,
    }),
    {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
