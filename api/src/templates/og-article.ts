export interface OgArticleData {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  tag?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export function renderOgArticle(data: OgArticleData): string {
  const {
    title,
    description = '',
    author = '',
    date = '',
    tag = '',
    bgColor = '#ffffff',
    textColor = '#0f172a',
    accentColor = '#6366f1',
  } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: ${escapeHtml(bgColor)};
      color: ${escapeHtml(textColor)};
      font-family: -apple-system, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 80px;
      overflow: hidden;
    }
    .tag {
      display: inline-block;
      background: ${escapeHtml(accentColor)};
      color: white;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 32px;
      width: fit-content;
    }
    h1 {
      font-size: 60px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 20px;
      max-width: 1000px;
    }
    p {
      font-size: 26px;
      opacity: 0.65;
      line-height: 1.4;
      max-width: 900px;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 18px;
      opacity: 0.55;
    }
    .meta-dot { opacity: 0.4; }
    .left-bar {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 8px;
      background: ${escapeHtml(accentColor)};
    }
  </style>
</head>
<body>
  <div class="left-bar"></div>
  <div>
    ${tag ? `<div class="tag">${escapeHtml(tag)}</div>` : ''}
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
  </div>
  <div class="meta">
    ${author ? `<span>${escapeHtml(author)}</span>` : ''}
    ${author && date ? `<span class="meta-dot">·</span>` : ''}
    ${date ? `<span>${escapeHtml(date)}</span>` : ''}
  </div>
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
