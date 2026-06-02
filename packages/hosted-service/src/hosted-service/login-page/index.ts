import {
  renderBrand,
  renderDevLogin,
  renderError,
  renderFooter,
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

  return renderDocument({
    body: `
  <main>
    ${renderBrand()}
    <h1>${escapeHtml(headline)}</h1>
    <p>选择一个身份提供方进入，首次使用会自动完成账号创建和身份绑定。</p>
    ${renderError(params.error)}
    ${renderProviderList(links.providers)}
    ${renderDevLogin(params.allowDevLogin, links)}
    ${renderFooter(params.clientId)}
  </main>`,
    title: headline,
  });
}
