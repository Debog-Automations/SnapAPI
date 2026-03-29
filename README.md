# SnapAPI — Screenshot & OG Image API

A developer REST API for capturing web screenshots and generating Open Graph social preview images.

## Structure

```
/
├── api/          # Node.js + Hono API server
└── landing/      # Astro static landing page
```

## API Quick Start

```bash
# Get a free API key
curl -X POST https://api.snapapi.dev/v1/keys/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com"}'

# Take a screenshot
curl "https://api.snapapi.dev/v1/screenshot?url=https://example.com" \
  -H "Authorization: Bearer snap_your_key" \
  --output screenshot.png

# Generate an OG image
curl -X POST https://api.snapapi.dev/v1/og-image \
  -H "Authorization: Bearer snap_your_key" \
  -H "Content-Type: application/json" \
  -d '{"template":"default","data":{"title":"Hello World","description":"My first OG image"}}' \
  --output og.png
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Health check |
| POST | /v1/keys/create | No | Create API key |
| GET | /v1/keys/me | Yes | Get key info & usage |
| GET | /v1/screenshot | Yes | Capture web screenshot |
| POST | /v1/og-image | Yes | Generate OG image |
| GET | /v1/og-image/templates | Yes | List OG templates |
| POST | /v1/billing/checkout | Yes | Create Stripe checkout |
| POST | /v1/billing/webhook | No | Stripe webhook |

## Plans

| Plan | Price | Requests/mo |
|------|-------|-------------|
| Free | $0 | 100 |
| Starter | $9/mo | 5,000 |
| Pro | $29/mo | 25,000 |

## Local Development

```bash
cd api
cp .env.example .env
npm install
npx playwright install chromium
npm run dev
```

## Deployment (Railway)

1. Connect GitHub repo to Railway
2. Set environment variables from `.env.example`
3. Deploy — Railway auto-runs `railway.json` build steps

## OG Image Templates

### `default`
Dark background. Fields: `title`, `description`, `logo`, `siteName`, `bgColor`, `textColor`, `accentColor`

### `article`
Light blog-post style. Fields: `title`, `description`, `author`, `date`, `tag`, `bgColor`, `textColor`, `accentColor`
