import type { HostedAuthStore } from "./store/index.js";

export interface HostedAuthApplication {
  allowedRedirectURIs?: string[];
  clientId: string;
  name?: string;
  redirectURI?: string;
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
  authBaseURL: string;
  cookieDomain?: string;
  cookieName?: string;
  feishu?: HostedFeishuConfig;
  github?: HostedGitHubConfig;
  google?: HostedGoogleConfig;
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
