import { escapeHtml } from "./escape.js";
import type { LoginProviderId, LoginProviderView } from "./types.js";

export type LoginPageHeroContent = {
  brandName: string;
  heroDescription: string;
  heroKicker: string;
  heroTitle: string;
  logoUrl?: string;
};

export function renderBrand(appName: string, logoUrl?: string) {
  const mark = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="" />`
    : `<svg viewBox="0 0 32 32">
          <path d="M13.7 4.8h9.2l-5.1 9.1h6.6L10.2 27.5l4.1-10.6H7.6L13.7 4.8z" fill="currentColor"/>
        </svg>`;

  return `
    <div class="brand-row" aria-label="${escapeHtml(appName)}">
      <div class="mark" aria-hidden="true">
        ${mark}
      </div>
      <div class="brand-title">${escapeHtml(appName)}</div>
    </div>`;
}

export function renderHero(content: LoginPageHeroContent) {
  return `
    <section class="hero-copy" aria-label="登录介绍">
      ${renderBrand(content.brandName, content.logoUrl)}
      <div class="hero-kicker">${escapeHtml(content.heroKicker)}</div>
      <h1>${escapeHtml(content.heroTitle)}</h1>
      <p>${escapeHtml(content.heroDescription)}</p>
    </section>`;
}

export function renderError(error?: string) {
  return error ? `<div class="error">${escapeHtml(error)}</div>` : "";
}

export function renderProviderList(providers: LoginProviderView[], primaryProviderId?: LoginProviderId) {
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const primaryProvider = primaryProviderId
    ? enabledProviders.find((provider) => provider.id === primaryProviderId) ?? enabledProviders[0]
    : enabledProviders[0];

  if (!primaryProvider) {
    return `<div class="provider-empty">当前没有可用登录方式，请联系管理员完成 OAuth 配置。</div>`;
  }

  const secondaryProviders = enabledProviders.filter((provider) => provider.id !== primaryProvider.id);

  return `
    <section class="provider-list" aria-label="登录身份提供方">
      ${renderPrimaryProvider(primaryProvider)}
      ${secondaryProviders.length ? `
      <div class="provider-divider"><span>其他登录方式</span></div>
      <div class="secondary-provider-list">
        ${secondaryProviders.map(renderSecondaryProvider).join("\n")}
      </div>` : ""}
    </section>`;
}

export function renderFooter(clientId: string, footerText?: string) {
  if (footerText === "") {
    return "";
  }

  const label = footerText ?? `client_id: ${clientId}`;

  return `
    <div class="footer-row">
      <span>${escapeHtml(label)}</span>
    </div>`;
}

function renderProviderTile(provider: LoginProviderView) {
  return `
      <a class="provider-option" href="${escapeHtml(provider.href)}">
        <span class="provider-icon ${provider.iconClassName}">${provider.icon}</span>
        <span class="provider-name">${escapeHtml(provider.label)}</span>
      </a>`;
}

function renderPrimaryProvider(provider: LoginProviderView) {
  return `
      <a class="primary-provider" href="${escapeHtml(provider.href)}">
        <span class="primary-provider-icon ${provider.iconClassName}">${provider.icon}</span>
        <span>使用<span class="provider-name">${escapeHtml(provider.label)}</span>登录</span>
      </a>`;
}

function renderSecondaryProvider(provider: LoginProviderView) {
  return renderProviderTile(provider);
}
