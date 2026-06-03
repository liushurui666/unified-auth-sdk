import { DEFAULT_CLIENT_ID } from "./constants.js";
import type { HostedAuthApplication, HostedAuthServiceOptions } from "./types.js";

export function normalizeBaseURL(baseURL: string) {
  return baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
}

export function getAuthBaseURL(options: HostedAuthServiceOptions) {
  const baseURL = options.authBaseURL ?? options.siteURL;

  if (!baseURL) {
    throw new Error("createHostedAuthRouteHandlers requires siteURL or authBaseURL.");
  }

  return normalizeBaseURL(baseURL);
}

export function getApplication(options: HostedAuthServiceOptions) {
  const redirectURI = options.redirectURI ?? (options.siteURL ? `${normalizeBaseURL(options.siteURL)}/` : "/");
  const allowedRedirectURIs = options.allowedRedirectURIs ?? [redirectURI];

  return {
    allowedRedirectURIs,
    appearance: options.appearance,
    clientId: options.clientId || DEFAULT_CLIENT_ID,
    loginPage: options.loginPage,
    loginPageComponent: options.loginPageComponent,
    name: options.appName ?? options.clientId ?? "Application",
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
