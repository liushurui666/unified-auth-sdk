import { escapeHtml } from "./escape.js";
import type { LoginPageLinks, LoginProviderView } from "./types.js";

export function renderBrand() {
  return `
    <div class="brand-row">
      <div class="mark">AUTH</div>
      <div class="brand-title">统一认证中心</div>
    </div>`;
}

export function renderError(error?: string) {
  return error ? `<div class="error">${escapeHtml(error)}</div>` : "";
}

export function renderProviderList(providers: LoginProviderView[]) {
  return `
    <section class="provider-list" aria-label="登录身份提供方">
      ${providers.map(renderProviderTile).join("\n")}
    </section>`;
}

export function renderDevLogin(allowDevLogin: boolean, links: LoginPageLinks) {
  if (!allowDevLogin) {
    return "";
  }

  return `<a class="dev-link" href="${escapeHtml(links.devLogin)}">使用开发账号进入</a>`;
}

export function renderFooter(clientId: string) {
  return `
    <div class="footer-row">
      <span>client_id: ${escapeHtml(clientId)}</span>
    </div>`;
}

function renderProviderTile(provider: LoginProviderView) {
  const disabledClass = provider.enabled ? "" : "disabled";

  return `
      <a class="provider-option ${disabledClass}" href="${escapeHtml(provider.href)}">
        <span class="provider-icon ${provider.iconClassName}">${provider.icon}</span>
        <span class="provider-copy">
          <span class="provider-name">${escapeHtml(provider.label)}</span>
        </span>
      </a>`;
}
