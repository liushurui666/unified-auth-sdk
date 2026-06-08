import type {
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
  providers: LoginProviderView[];
};

export type RenderLoginPageParams = {
  app: HostedAuthApplication;
  authBaseURL: string;
  clientId: string;
  enabledProviders: HostedAuthLoginProviderId[];
  error?: string;
  loginPageComponent?: HostedAuthLoginPageComponent;
  redirectURI: string;
};
