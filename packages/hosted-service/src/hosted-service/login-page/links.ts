import { createProviderStartUrl } from "../applications.js";
import { feishuIcon, githubIcon, googleIcon } from "./icons.js";
import type { LoginPageLinks, LoginProviderId, LoginProviderView, RenderLoginPageParams } from "./types.js";
import type { HostedAuthLoginPageConfig } from "../types.js";

const defaultProviderOrder: LoginProviderId[] = ["feishu", "google", "github"];

const providerDefinitions: Record<LoginProviderId, {
  icon: string;
  iconClassName: string;
  label: string;
}> = {
  feishu: {
    icon: feishuIcon,
    iconClassName: "provider-icon-feishu",
    label: "飞书",
  },
  github: {
    icon: githubIcon,
    iconClassName: "provider-icon-github",
    label: "GitHub",
  },
  google: {
    icon: googleIcon,
    iconClassName: "provider-icon-google",
    label: "Google",
  },
};

function createProvider(params: {
  authBaseURL: string;
  clientId: string;
  enabled: boolean;
  id: LoginProviderView["id"];
  redirectURI: string;
}): LoginProviderView {
  const provider = providerDefinitions[params.id];

  return {
    enabled: params.enabled,
    href: createProviderStartUrl(
      params.authBaseURL,
      params.id,
      params.clientId,
      params.redirectURI,
    ).toString(),
    icon: provider.icon,
    iconClassName: provider.iconClassName,
    id: params.id,
    label: provider.label,
  };
}

function getProviderEnabled(params: RenderLoginPageParams, provider: LoginProviderId) {
  return params.enabledProviders.includes(provider);
}

function getProviderOrder(providers?: LoginProviderId[]) {
  const ordered = providers?.length ? providers : defaultProviderOrder;

  return ordered.filter((provider, index) => ordered.indexOf(provider) === index);
}

export function createLoginPageLinks(
  params: RenderLoginPageParams,
  loginPage?: HostedAuthLoginPageConfig,
): LoginPageLinks {
  return {
    providers: getProviderOrder(loginPage?.providers).map((provider) => createProvider({
      ...params,
      enabled: getProviderEnabled(params, provider),
      id: provider,
    })),
  };
}
