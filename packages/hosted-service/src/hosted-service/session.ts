import type { AuthContext, AuthSession } from "@rc-tool/unified-auth-sdk/service-client";
import { AUTH_SERVICE_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants.js";
import { getCookie } from "./cookies.js";
import { parseSignedToken } from "./crypto.js";
import type { HostedAuthSessionContext, HostedAuthSessionRecord, HostedAuthStore } from "./store/index.js";
import type { HostedAuthServiceOptions, SessionPayload } from "./types.js";

export function createSessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
}

export function createSessionPayload(session: HostedAuthSessionRecord): SessionPayload {
  return {
    clientId: session.clientId,
    exp: Math.floor(Date.parse(session.expiresAt) / 1000),
    sessionId: session.id,
  };
}

// cookie 里只放签名后的 session id，不放完整用户资料；用户信息每次从 store 解析。
export function parseSessionPayload(request: Request, options: HostedAuthServiceOptions) {
  const payload = parseSignedToken<SessionPayload>(
    getCookie(request, options.cookieName ?? AUTH_SERVICE_SESSION_COOKIE),
    options.sessionSecret,
  );

  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function getStoredSession(
  request: Request,
  options: HostedAuthServiceOptions,
  store: HostedAuthStore,
) {
  const payload = parseSessionPayload(request, options);

  if (!payload) {
    return null;
  }

  const stored = await store.getSession(payload.sessionId);

  // 同一个浏览器可能登录多个业务应用，clientId 必须匹配当前应用。
  if (!stored || stored.session.clientId !== payload.clientId) {
    return null;
  }

  return stored;
}

export async function deleteRequestSession(
  request: Request,
  options: HostedAuthServiceOptions,
  store: HostedAuthStore,
) {
  const payload = parseSessionPayload(request, options);

  if (payload) {
    await store.deleteSession(payload.sessionId);
  }
}

export function toAuthSession(session: HostedAuthSessionRecord): AuthSession {
  return {
    clientId: session.clientId,
    expiresAt: session.expiresAt,
    id: session.id,
    userId: session.userId,
  };
}

export function toAuthContext(stored: HostedAuthSessionContext | null): AuthContext {
  return {
    session: stored ? toAuthSession(stored.session) : null,
    user: stored?.user ?? null,
  };
}
