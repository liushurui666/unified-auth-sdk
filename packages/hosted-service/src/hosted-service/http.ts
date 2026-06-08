export function html(content: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set("content-type", "text/html; charset=utf-8");

  return new Response(content, {
    ...init,
    headers,
  });
}

export function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function redirect(url: string, headers?: Headers) {
  const responseHeaders = new Headers(headers);

  responseHeaders.set("location", url);

  return new Response(null, {
    headers: responseHeaders,
    status: 302,
  });
}
