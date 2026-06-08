import type { UnifiedAuthConfig } from "../config.js";

export type HostedAuthLoginProviderId = "feishu" | "github" | "google";
export type HostedBetterAuthProviderId = HostedAuthLoginProviderId | (string & {});

export interface HostedAuthBetterAuthProviderConfig {
  enabled?: boolean;
  providerId?: HostedBetterAuthProviderId;
  scopes?: string[];
}

export interface HostedAuthLoginProviderView {
  enabled: boolean;
  href: string;
  icon: string;
  iconClassName: string;
  id: HostedAuthLoginProviderId;
  label: string;
}

export interface HostedAuthLoginPageModel {
  appName: string;
  clientId: string;
  error?: string;
  providers: HostedAuthLoginProviderView[];
  redirectURI: string;
}

export interface HostedAuthLoginPageProps {
  config: HostedAuthLoginPageConfig;
  model: HostedAuthLoginPageModel;
}

export type HostedAuthLoginPageComponent = ((props: HostedAuthLoginPageProps) => string) & {
  defaultConfig?: HostedAuthLoginPageConfig;
};

export interface HostedAuthApplication {
  allowedRedirectURIs?: string[];
  clientId: string;
  loginPageComponent?: HostedAuthLoginPageComponent;
  name?: string;
  redirectURI?: string;
}

export interface HostedAuthRuntimeEnv {
  AUTH_ALLOWED_REDIRECT_URI?: string;
  AUTH_CLIENT_ID?: string;
  AUTH_CLIENT_NAME?: string;
  AUTH_SERVICE_URL?: string;
  BETTER_AUTH_URL?: string;
}

export interface HostedAuthSingleApplicationOptions {
  allowedRedirectURIs?: string[];
  appName?: string;
  clientId?: string;
  redirectURI?: string;
  siteURL?: string;
}

export interface HostedAuthLoginPageConfig {
  backgroundImageUrl?: string;
  brandLabel?: string;
  brandName?: string;
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

export interface HostedBetterAuthSessionResult {
  session: {
    expiresAt?: Date | string | null;
    id?: string | null;
    token?: string | null;
    userId?: string | null;
  };
  user: {
    email?: string | null;
    emailVerified?: boolean;
    id: string;
    image?: string | null;
    name?: string | null;
    [key: string]: unknown;
  };
}

export interface HostedBetterAuthServer {
  handler(request: Request): Promise<Response> | Response;
}

export interface HostedAuthServiceOptions extends HostedAuthSingleApplicationOptions {
  auth: HostedBetterAuthServer;
  authBaseURL?: string;
  authProviders?: Partial<Record<HostedAuthLoginProviderId, HostedAuthBetterAuthProviderConfig>>;
  config?: UnifiedAuthConfig;
  env?: HostedAuthRuntimeEnv;
  loginPageComponent?: HostedAuthLoginPageComponent;
}
