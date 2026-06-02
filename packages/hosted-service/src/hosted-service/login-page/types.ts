import type { HostedAuthApplication } from "../types.js";

export type LoginProviderId = "feishu" | "github" | "google";

export type LoginProviderView = {
  enabled: boolean;
  href: string;
  icon: string;
  iconClassName: string;
  id: LoginProviderId;
  label: string;
};

export type LoginPageLinks = {
  devLogin: string;
  providers: LoginProviderView[];
};

export type RenderLoginPageParams = {
  allowDevLogin: boolean;
  app: HostedAuthApplication;
  authBaseURL: string;
  clientId: string;
  error?: string;
  feishuEnabled: boolean;
  githubEnabled: boolean;
  googleEnabled: boolean;
  redirectURI: string;
};
