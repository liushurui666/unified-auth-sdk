import { createProviderStartUrl } from "../applications.js";
import { feishuIcon, githubIcon, googleIcon } from "./icons.js";
import type { LoginPageLinks, LoginProviderView, RenderLoginPageParams } from "./types.js";

function createDevLoginUrl(params: RenderLoginPageParams) {
  const devUrl = new URL("/api/auth/dev-login", params.authBaseURL);

  devUrl.searchParams.set("client_id", params.clientId);
  devUrl.searchParams.set("redirect_uri", params.redirectURI);

  return devUrl.toString();
}

function createProvider(params: {
  authBaseURL: string;
  clientId: string;
  enabled: boolean;
  icon: string;
  iconClassName: string;
  id: LoginProviderView["id"];
  label: string;
  redirectURI: string;
}): LoginProviderView {
  return {
    enabled: params.enabled,
    href: createProviderStartUrl(
      params.authBaseURL,
      params.id,
      params.clientId,
      params.redirectURI,
    ).toString(),
    icon: params.icon,
    iconClassName: params.iconClassName,
    id: params.id,
    label: params.label,
  };
}

export function createLoginPageLinks(params: RenderLoginPageParams): LoginPageLinks {
  return {
    devLogin: createDevLoginUrl(params),
    providers: [
      createProvider({
        ...params,
        enabled: params.feishuEnabled,
        icon: feishuIcon,
        iconClassName: "provider-icon-feishu",
        id: "feishu",
        label: "飞书",
      }),
      createProvider({
        ...params,
        enabled: params.googleEnabled,
        icon: googleIcon,
        iconClassName: "provider-icon-google",
        id: "google",
        label: "Google",
      }),
      createProvider({
        ...params,
        enabled: params.githubEnabled,
        icon: githubIcon,
        iconClassName: "provider-icon-github",
        id: "github",
        label: "GitHub",
      }),
    ],
  };
}
