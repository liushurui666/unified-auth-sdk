export const DEFAULT_CALLBACK_URL = "/";

export function sanitizeCallbackURL(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/")) {
    return DEFAULT_CALLBACK_URL;
  }
  if (raw.startsWith("//") || raw.startsWith("/\\")) {
    return DEFAULT_CALLBACK_URL;
  }
  return raw;
}

export function readCallbackURL(params: {
  callbackURL?: string;
  returnTo?: string;
}): string {
  return sanitizeCallbackURL(params.callbackURL ?? params.returnTo);
}

export function toAbsoluteUrl(pathOrUrl: string, baseURL?: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const base =
    baseURL ??
    (typeof window === "undefined" ? "http://localhost:3000" : window.location.origin);
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}
