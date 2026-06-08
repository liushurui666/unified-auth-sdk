import {
  type LoginPageHeroContent,
  renderError,
  renderFooter,
  renderHero,
  renderProviderList,
} from "./components.js";
import { renderDocument } from "./document.js";
import { escapeHtml } from "./escape.js";
import { createLoginPageLinks } from "./links.js";
import type {
  LoginPageComponent,
  LoginPageModel,
  LoginPageProps,
  LoginProviderView,
  RenderLoginPageParams,
} from "./types.js";
import type { HostedAuthLoginPageConfig } from "../types.js";

type LoginPageContent = LoginPageHeroContent & {
  footerText?: string;
  panelDescription: string;
  panelKicker: string;
  panelTitle: string;
  statusText: string;
};

export function renderLoginPage(params: RenderLoginPageParams) {
  const component = params.app.loginPageComponent ?? params.loginPageComponent ?? defaultHostedAuthLoginPageComponent;
  const loginPage = component.defaultConfig ?? {};

  return component({
    config: loginPage,
    model: createLoginPageModel(params, loginPage),
  });
}

export function createHostedAuthLoginPageComponent(
  defaultConfig: HostedAuthLoginPageConfig = {},
): LoginPageComponent {
  const component: LoginPageComponent = (props) => defaultHostedAuthLoginPageComponent({
    config: mergeLoginPageConfig(defaultConfig, props.config),
    model: props.model,
  });

  component.defaultConfig = defaultConfig;

  return component;
}

export const defaultHostedAuthLoginPageComponent: LoginPageComponent = (props: LoginPageProps) => {
  const primaryProvider = resolvePrimaryProvider(props.model.providers, props.config.primaryProvider);
  const content = resolveLoginPageContent(props.config, props.model.appName, primaryProvider);
  const status = content.statusText
    ? `<div class="auth-status">${escapeHtml(content.statusText)}</div>`
    : "";

  return renderDocument({
    backgroundImageUrl: props.config.backgroundImageUrl,
    body: `
  ${status}
  <main class="auth-shell">
    ${renderHero(content)}
    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-kicker">${escapeHtml(content.panelKicker)}</div>
      <h2 id="login-title">${escapeHtml(content.panelTitle)}</h2>
      <p>${escapeHtml(content.panelDescription)}</p>
      ${renderError(props.model.error)}
      ${renderProviderList(props.model.providers, props.config.primaryProvider)}
      ${renderFooter(props.model.clientId, content.footerText)}
    </section>
  </main>`,
    title: content.panelKicker,
  });
};

function createLoginPageModel(
  params: RenderLoginPageParams,
  loginPage: HostedAuthLoginPageConfig,
): LoginPageModel {
  const links = createLoginPageLinks(params, loginPage);

  return {
    appName: params.app.name ?? params.clientId,
    clientId: params.clientId,
    error: params.error,
    providers: links.providers,
    redirectURI: params.redirectURI,
  };
}

function mergeLoginPageConfig(
  defaultConfig: HostedAuthLoginPageConfig,
  overrideConfig: HostedAuthLoginPageConfig,
): HostedAuthLoginPageConfig {
  return {
    ...defaultConfig,
    ...overrideConfig,
    backgroundImageUrl: overrideConfig.backgroundImageUrl ?? defaultConfig.backgroundImageUrl,
  };
}

function resolvePrimaryProvider(
  providers: LoginProviderView[],
  primaryProviderId?: HostedAuthLoginPageConfig["primaryProvider"],
) {
  const enabledProviders = providers.filter((provider) => provider.enabled);

  return primaryProviderId
    ? enabledProviders.find((provider) => provider.id === primaryProviderId) ?? enabledProviders[0]
    : enabledProviders[0];
}

function resolveLoginPageContent(
  loginPage: HostedAuthLoginPageConfig,
  appName: string,
  primaryProvider?: LoginProviderView,
): LoginPageContent {
  const brandName = loginPage.brandName ?? appName;
  const providerName = primaryProvider?.label ?? "统一账号";

  return {
    brandName,
    footerText: loginPage.footerText,
    heroDescription: loginPage.heroDescription ?? `登录后将回到 ${appName}，继续处理你的工作事项。`,
    heroKicker: loginPage.heroKicker ?? loginPage.brandLabel ?? "统一认证中心",
    heroTitle: loginPage.heroTitle ?? `用${providerName}安全登录`,
    logoUrl: loginPage.logoUrl,
    panelDescription: loginPage.panelDescription ?? "使用企业授权账号完成身份校验，首次使用会自动完成账号创建和身份绑定。",
    panelKicker: loginPage.panelKicker ?? `${appName} 统一登录`,
    panelTitle: loginPage.panelTitle ?? (primaryProvider ? `${primaryProvider.label}登录` : "选择登录方式"),
    statusText: loginPage.statusText ?? "安全认证",
  };
}
