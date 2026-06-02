import { DEFAULT_CLIENT_ID } from "./constants.js";
import type { HostedAuthApplication, HostedAuthServiceOptions } from "./types.js";

export function normalizeBaseURL(baseURL: string) {
  return baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
}

export function getApplication(options: HostedAuthServiceOptions, clientId?: string) {
  const applications = options.applications ?? [];
  const fallback: HostedAuthApplication = {
    clientId: clientId || DEFAULT_CLIENT_ID,
    name: clientId || "Application",
  };

  return applications.find((app) => app.clientId === clientId) ?? applications[0] ?? fallback;
}

export function getClientId(request: Request, options: HostedAuthServiceOptions) {
  const url = new URL(request.url);

  return url.searchParams.get("client_id") ?? getApplication(options).clientId;
}

export function getRedirectURI(request: Request, app: HostedAuthApplication) {
  const url = new URL(request.url);

  return url.searchParams.get("redirect_uri") ?? app.redirectURI ?? app.allowedRedirectURIs?.[0] ?? "/";
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
