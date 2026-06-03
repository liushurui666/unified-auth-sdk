import {
  renderDevLogin,
  renderError,
  renderFooter,
  renderHero,
  renderProviderList,
} from "./components.js";
import { renderDocument } from "./document.js";
import { escapeHtml } from "./escape.js";
import { createLoginPageLinks } from "./links.js";
import type { RenderLoginPageParams } from "./types.js";

export function renderLoginPage(params: RenderLoginPageParams) {
  const title = params.app.name ?? params.clientId;
  const headline = `${title} 统一登录`;
  const links = createLoginPageLinks(params);
  const primaryProvider = links.providers.find((provider) => provider.enabled && provider.id === "feishu")
    ?? links.providers.find((provider) => provider.enabled);

  return renderDocument({
    backgroundImageUrl: params.app.appearance?.backgroundImageUrl ?? params.appearance?.backgroundImageUrl,
    body: `
  <div class="auth-status">安全认证</div>
  <main class="auth-shell">
    ${renderHero(title, primaryProvider)}
    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-kicker">${escapeHtml(headline)}</div>
      <h2 id="login-title">${escapeHtml(primaryProvider ? `${primaryProvider.label}登录` : "选择登录方式")}</h2>
      <p>使用企业授权账号完成身份校验，首次使用会自动完成账号创建和身份绑定。</p>
      ${renderError(params.error)}
      ${renderProviderList(links.providers)}
      ${renderDevLogin(params.allowDevLogin, links)}
      ${renderFooter(params.clientId)}
    </section>
  </main>`,
    title: headline,
  });
}
