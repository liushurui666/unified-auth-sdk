import { randomBytes } from "node:crypto";
import { AUTH_SERVICE_STATE_COOKIE, STATE_MAX_AGE_SECONDS } from "./constants.js";
import { getCookie, serializeCookie, shouldUseSecureCookie } from "./cookies.js";
import { createSignedToken, parseSignedToken } from "./crypto.js";
import type { HostedAuthApplication, HostedAuthServiceOptions, StatePayload } from "./types.js";

export function createOAuthState(app: HostedAuthApplication, redirectURI: string) {
  const state = randomBytes(24).toString("base64url");
  const payload: StatePayload = {
    clientId: app.clientId,
    exp: Math.floor(Date.now() / 1000) + STATE_MAX_AGE_SECONDS,
    redirectURI,
    state,
  };

  return { payload, state };
}

export function createOAuthStateCookie(
  request: Request,
  options: HostedAuthServiceOptions,
  payload: StatePayload,
) {
  return serializeCookie({
    domain: options.cookieDomain,
    maxAge: STATE_MAX_AGE_SECONDS,
    name: AUTH_SERVICE_STATE_COOKIE,
    secure: shouldUseSecureCookie(request),
    value: createSignedToken(payload, options.sessionSecret),
  });
}

export function readOAuthCallbackState(request: Request, options: HostedAuthServiceOptions) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = parseSignedToken<StatePayload>(
    getCookie(request, AUTH_SERVICE_STATE_COOKIE),
    options.sessionSecret,
  );

  if (!code || !state || !savedState || savedState.state !== state || isExpired(savedState)) {
    return null;
  }

  return { code, savedState };
}

function isExpired(savedState: StatePayload) {
  return savedState.exp < Math.floor(Date.now() / 1000);
}
