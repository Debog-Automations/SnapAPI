import { Hono } from 'hono';
import { getBrowser } from '../lib/browser.js';

const app = new Hono();

app.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.json({ error: 'url parameter is required' }, 400);
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return c.json({ error: 'Only http and https URLs are supported' }, 400);
    }
  } catch {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  const width = Math.min(parseInt(c.req.query('width') ?? '1280', 10), 2560);
  const height = Math.min(parseInt(c.req.query('height') ?? '720', 10), 2560);
  const format = c.req.query('format') === 'jpeg' ? 'jpeg' : 'png';
  const fullPage = c.req.query('full_page') === 'true';
  const quality = format === 'jpeg' ? Math.min(parseInt(c.req.query('quality') ?? '85', 10), 100) : undefined;
  const delay = Math.min(parseInt(c.req.query('delay') ?? '0', 10), 5000);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: isNaN(width) ? 1280 : width, height: isNaN(height) ? 720 : height });

    await page.goto(parsedUrl.toString(), {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    const screenshot = await page.screenshot({
      type: format,
      fullPage,
      quality,
    });

    const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Response(screenshot, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Screenshot failed';
    return c.json({ error: message }, 500);
  } finally {
    await page.close();
  }
});

export default app;
