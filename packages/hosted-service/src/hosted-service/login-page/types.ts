import type {
  HostedAuthAppearance,
  HostedAuthApplication,
  HostedAuthLoginPageComponent,
  HostedAuthLoginPageConfig,
  HostedAuthLoginPageModel,
  HostedAuthLoginPageProps,
  HostedAuthLoginProviderId,
  HostedAuthLoginProviderView,
} from "../types.js";

export type LoginProviderId = HostedAuthLoginProviderId;

export type LoginProviderView = HostedAuthLoginProviderView;

export type LoginPageModel = HostedAuthLoginPageModel;

export type LoginPageProps = HostedAuthLoginPageProps;

export type LoginPageComponent = HostedAuthLoginPageComponent;

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
  loginPageComponent?: HostedAuthLoginPageComponent;
  redirectURI: string;
};
