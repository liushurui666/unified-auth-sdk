import { escapeHtml } from "./escape.js";
import { faviconHref } from "./icons.js";
import { loginPageStyles } from "./styles.js";

export function renderDocument(params: {
  body: string;
  title: string;
}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="${faviconHref}" />
  <title>${escapeHtml(params.title)}</title>
  <style>${loginPageStyles}</style>
</head>
<body>
${params.body}
</body>
</html>`;
}
