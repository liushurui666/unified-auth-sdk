import type {
  HostedAuthAppearance,
  HostedAuthApplication,
  HostedAuthLoginPageConfig,
  HostedAuthLoginProviderId,
} from "../types.js";

export type LoginProviderId = HostedAuthLoginProviderId;

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
  appearance?: HostedAuthAppearance;
  app: HostedAuthApplication;
  authBaseURL: string;
  clientId: string;
  error?: string;
  feishuEnabled: boolean;
  githubEnabled: boolean;
  googleEnabled: boolean;
  loginPage?: HostedAuthLoginPageConfig;
  redirectURI: string;
};
