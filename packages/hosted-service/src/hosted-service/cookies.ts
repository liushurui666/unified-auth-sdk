import { AUTH_SERVICE_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants.js";
import { createSignedToken } from "./crypto.js";
import type { HostedAuthServiceOptions, SessionPayload } from "./types.js";

export function appendCookie(headers: Headers, cookie: string) {
  headers.append("set-cookie", cookie);
}

export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const prefix = `${name}=`;
  const item = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

export function shouldUseSecureCookie(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export function serializeCookie(params: {
  domain?: string;
  httpOnly?: boolean;
  maxAge?: number;
  name: string;
  path?: string;
  sameSite?: "Lax" | "None" | "Strict";
  secure?: boolean;
  value: string;
}) {
  const parts = [
    `${params.name}=${encodeURIComponent(params.value)}`,
    `Path=${params.path ?? "/"}`,
    `SameSite=${params.sameSite ?? "Lax"}`,
  ];

  if (params.httpOnly ?? true) parts.push("HttpOnly");
  if (typeof params.maxAge === "number") parts.push(`Max-Age=${params.maxAge}`);
  if (params.domain) parts.push(`Domain=${params.domain}`);
  if (params.secure) parts.push("Secure");

  return parts.join("; ");
}

export function clearCookie(request: Request, options: HostedAuthServiceOptions, name: string) {
  return serializeCookie({
    domain: options.cookieDomain,
    maxAge: 0,
    name,
    secure: shouldUseSecureCookie(request),
    value: "",
  });
}

export function createSessionCookie(
  request: Request,
  options: HostedAuthServiceOptions,
  payload: SessionPayload,
) {
  return serializeCookie({
    domain: options.cookieDomain,
    maxAge: SESSION_MAX_AGE_SECONDS,
    name: options.cookieName ?? AUTH_SERVICE_SESSION_COOKIE,
    secure: shouldUseSecureCookie(request),
    value: createSignedToken(payload, options.sessionSecret),
  });
}
