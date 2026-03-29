export interface OgDefaultData {
  title: string;
  description?: string;
  logo?: string;
  siteName?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export function renderOgDefault(data: OgDefaultData): string {
  const {
    title,
    description = '',
    logo,
    siteName = '',
    bgColor = '#0f172a',
    textColor = '#f1f5f9',
    accentColor = '#6366f1',
  } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body {
      width: 1200px;
      height: 630px;
      background: ${escapeHtml(bgColor)};
      color: ${escapeHtml(textColor)};
      font-family: 'Inter', -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 80px;
      overflow: hidden;
      position: relative;
    }
    .accent-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 6px;
      background: ${escapeHtml(accentColor)};
    }
    .logo-wrap {
      margin-bottom: 32px;
    }
    .logo-wrap img {
      height: 48px;
      max-width: 200px;
      object-fit: contain;
    }
    .site-name {
      font-size: 18px;
      font-weight: 600;
      opacity: 0.7;
      margin-bottom: 24px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    h1 {
      font-size: 64px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      max-width: 900px;
      word-break: break-word;
    }
    p {
      font-size: 28px;
      font-weight: 400;
      opacity: 0.75;
      line-height: 1.4;
      max-width: 800px;
    }
    .corner-badge {
      position: absolute;
      bottom: 40px;
      right: 80px;
      font-size: 14px;
      opacity: 0.4;
      letter-spacing: 0.08em;
    }
  </style>
</head>
<body>
  <div class="accent-bar"></div>
  ${logo ? `<div class="logo-wrap"><img src="${escapeHtml(logo)}" alt="logo"></div>` : ''}
  ${siteName ? `<div class="site-name">${escapeHtml(siteName)}</div>` : ''}
  <h1>${escapeHtml(title)}</h1>
  ${description ? `<p>${escapeHtml(description)}</p>` : ''}
  <div class="corner-badge">snapapi.dev</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
