import type { HostedAuthStore } from "./store/index.js";

export type HostedAuthLoginProviderId = "feishu" | "github" | "google";

export interface HostedAuthApplication {
  allowedRedirectURIs?: string[];
  appearance?: HostedAuthAppearance;
  clientId: string;
  loginPage?: HostedAuthLoginPageConfig;
  name?: string;
  redirectURI?: string;
}

export interface HostedAuthAppearance {
  backgroundImageUrl?: string;
}

export interface HostedAuthLoginPageConfig {
  backgroundImageUrl?: string;
  brandLabel?: string;
  brandName?: string;
  devLoginLabel?: string;
  footerText?: string;
  heroDescription?: string;
  heroKicker?: string;
  heroTitle?: string;
  logoUrl?: string;
  panelDescription?: string;
  panelKicker?: string;
  panelTitle?: string;
  primaryProvider?: HostedAuthLoginProviderId;
  providers?: HostedAuthLoginProviderId[];
  statusText?: string;
}

export interface HostedFeishuConfig {
  appId?: string;
  appSecret?: string;
  redirectURI?: string;
}

export interface HostedGoogleConfig {
  clientId?: string;
  clientSecret?: string;
  redirectURI?: string;
  scopes?: string[];
}

export interface HostedGitHubConfig {
  clientId?: string;
  clientSecret?: string;
  redirectURI?: string;
  scopes?: string[];
}

export interface HostedAuthServiceOptions {
  allowDevLogin?: boolean;
  applications?: HostedAuthApplication[];
  appearance?: HostedAuthAppearance;
  authBaseURL: string;
  cookieDomain?: string;
  cookieName?: string;
  feishu?: HostedFeishuConfig;
  github?: HostedGitHubConfig;
  google?: HostedGoogleConfig;
  loginPage?: HostedAuthLoginPageConfig;
  sessionSecret: string;
  store?: HostedAuthStore;
}

export type SessionPayload = {
  clientId: string;
  exp: number;
  sessionId: string;
};

export type StatePayload = {
  clientId: string;
  exp: number;
  redirectURI: string;
  state: string;
};
