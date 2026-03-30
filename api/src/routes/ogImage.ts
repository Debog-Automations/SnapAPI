import { Hono } from 'hono';
import { getBrowser } from '../lib/browser.js';
import { renderOgDefault, type OgDefaultData } from '../templates/og-default.js';
import { renderOgArticle, type OgArticleData } from '../templates/og-article.js';

const app = new Hono();

const TEMPLATES = {
  default: renderOgDefault,
  article: renderOgArticle,
} as const;

type TemplateName = keyof typeof TEMPLATES;

app.post('/', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const template = (body.template as string) ?? 'default';
  if (!(template in TEMPLATES)) {
    return c.json({ error: `Unknown template. Available: ${Object.keys(TEMPLATES).join(', ')}` }, 400);
  }

  const data = (body.data ?? {}) as Record<string, unknown>;

  if (!data.title || typeof data.title !== 'string') {
    return c.json({ error: 'data.title is required' }, 400);
  }

  const format = body.format === 'jpeg' ? 'jpeg' : 'png';
  const renderFn = TEMPLATES[template as TemplateName];
  const html = renderFn(data as unknown as OgDefaultData & OgArticleData);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(html, { waitUntil: 'networkidle' });

    const screenshot = await page.screenshot({
      type: format,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });

    const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Response(new Uint8Array(screenshot), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OG image generation failed';
    return c.json({ error: message }, 500);
  } finally {
    await page.close();
  }
});

// List available templates
app.get('/templates', (c) => {
  return c.json({
    templates: [
      {
        name: 'default',
        description: 'Dark background with title, description, logo support',
        fields: ['title', 'description', 'logo', 'siteName', 'bgColor', 'textColor', 'accentColor'],
      },
      {
        name: 'article',
        description: 'Light blog-post style with author and date',
        fields: ['title', 'description', 'author', 'date', 'tag', 'bgColor', 'textColor', 'accentColor'],
      },
    ],
  });
});

export default app;
