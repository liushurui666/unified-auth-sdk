import { DEFAULT_CLIENT_ID } from "./constants.js";
import type { HostedAuthApplication, HostedAuthRuntimeEnv, HostedAuthServiceOptions } from "./types.js";

export function normalizeBaseURL(baseURL: string) {
  return baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
}

export function getAuthBaseURL(options: HostedAuthServiceOptions) {
  const env = getRuntimeEnv(options);
  const baseURL = options.authBaseURL
    ?? options.siteURL
    ?? options.config?.auth?.origin
    ?? options.config?.auth?.url
    ?? options.config?.app?.origin
    ?? getURLOrigin(options.config?.app?.url)
    ?? env.AUTH_SERVICE_URL
    ?? env.BETTER_AUTH_URL;

  if (!baseURL) {
    throw new Error("createHostedAuthRouteHandlers requires config.app.origin, config.auth.origin, siteURL, or authBaseURL.");
  }

  return normalizeBaseURL(baseURL);
}

export function getApplication(options: HostedAuthServiceOptions) {
  const env = getRuntimeEnv(options);
  const baseURL = options.siteURL
    ?? options.authBaseURL
    ?? options.config?.auth?.origin
    ?? options.config?.auth?.url
    ?? options.config?.app?.origin
    ?? getURLOrigin(options.config?.app?.url)
    ?? env.AUTH_SERVICE_URL
    ?? env.BETTER_AUTH_URL;
  const redirectURI = options.redirectURI
    ?? options.config?.app?.redirectURI
    ?? options.config?.app?.url
    ?? env.AUTH_ALLOWED_REDIRECT_URI
    ?? (baseURL ? `${normalizeBaseURL(baseURL)}/` : "/");
  const allowedRedirectURIs = options.allowedRedirectURIs ?? readAllowedRedirectURIs(env.AUTH_ALLOWED_REDIRECT_URI, redirectURI);
  const clientId = options.clientId ?? options.config?.app?.id ?? env.AUTH_CLIENT_ID ?? DEFAULT_CLIENT_ID;

  return {
    allowedRedirectURIs,
    clientId,
    loginPageComponent: options.loginPageComponent,
    name: options.appName ?? options.config?.app?.name ?? env.AUTH_CLIENT_NAME ?? clientId,
    redirectURI,
  } satisfies HostedAuthApplication;
}

export function getClientId(request: Request, options: HostedAuthServiceOptions) {
  const url = new URL(request.url);

  return url.searchParams.get("client_id") ?? getApplication(options).clientId;
}

export function getRedirectURI(request: Request, app: HostedAuthApplication) {
  const url = new URL(request.url);

  return url.searchParams.get("redirect_uri") ?? app.redirectURI ?? app.allowedRedirectURIs?.[0] ?? "/";
}

export function validateRequestClient(request: Request, options: HostedAuthServiceOptions) {
  const app = getApplication(options);
  const clientId = getClientId(request, options);

  if (clientId !== app.clientId) {
    return {
      app,
      clientId,
      error: `client_id ${clientId} is not configured for this auth route.`,
    };
  }

  return {
    app,
    clientId,
    error: undefined,
  };
}

export function isRedirectAllowed(redirectURI: string, app: HostedAuthApplication) {
  if (!app.allowedRedirectURIs?.length) {
    return true;
  }

  return app.allowedRedirectURIs.includes(redirectURI);
}

export function createProviderStartUrl(
  authBaseURL: string,
  provider: "feishu" | "github" | "google",
  clientId: string,
  redirectURI: string,
) {
  const startUrl = new URL(`/api/auth/${provider}/start`, authBaseURL);

  startUrl.searchParams.set("client_id", clientId);
  startUrl.searchParams.set("redirect_uri", redirectURI);

  return startUrl;
}

function getRuntimeEnv(options: HostedAuthServiceOptions): HostedAuthRuntimeEnv {
  if (options.env) {
    return options.env;
  }

  const runtime = globalThis as typeof globalThis & {
    process?: { env?: HostedAuthRuntimeEnv };
  };

  return runtime.process?.env ?? {};
}

function readAllowedRedirectURIs(value: string | undefined, fallback: string) {
  const parsed = value?.split(",").map((item) => item.trim()).filter(Boolean);

  return parsed?.length ? parsed : [fallback];
}

function getURLOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
