import { escapeCssString, escapeHtml } from "./escape.js";
import { faviconHref } from "./icons.js";
import { loginPageStyles } from "./styles.js";

export function renderDocument(params: {
  backgroundImageUrl?: string;
  body: string;
  title: string;
}) {
  const bodyStyle = params.backgroundImageUrl
    ? ` style="${escapeHtml(`--auth-background-image: url('${escapeCssString(params.backgroundImageUrl)}')`)}"`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="${faviconHref}" />
  <title>${escapeHtml(params.title)}</title>
  <style>${loginPageStyles}</style>
</head>
<body${bodyStyle}>
${params.body}
</body>
</html>`;
}
