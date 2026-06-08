import { createProviderStartUrl, getAuthBaseURL, getRedirectURI, isRedirectAllowed, validateRequestClient } from "./applications.js";
import { createBetterAuthHostedService } from "./better-auth.js";
import { html, json, redirect } from "./http.js";
import { renderLoginPage } from "./login-page/index.js";
import type { HostedAuthLoginProviderId, HostedAuthServiceOptions } from "./types.js";

const hostedProviders = ["feishu", "google", "github"] as const satisfies HostedAuthLoginProviderId[];

export function createHostedAuthService(options: HostedAuthServiceOptions) {
  const authBaseURL = getAuthBaseURL(options);
  const betterAuthService = createBetterAuthHostedService(options, authBaseURL);

  return {
    handleAuthRequest(request: Request) {
      return betterAuthService.handleAuthRequest(request);
    },
    handleContext(request: Request) {
      return betterAuthService.handleContext(request);
    },
    handleFeishuStart(request: Request) {
      return handleProviderStart(request, "feishu");
    },
    handleGitHubStart(request: Request) {
      return handleProviderStart(request, "github");
    },
    handleGoogleStart(request: Request) {
      return handleProviderStart(request, "google");
    },
    handleLogin(request: Request) {
      return handleLogin(request, options, authBaseURL);
    },
    handleLogout(request: Request) {
      return betterAuthService.handleLogout(request);
    },
    handleSession(request: Request) {
      return betterAuthService.handleSession(request);
    },
    handleUser(request: Request) {
      return betterAuthService.handleUser(request);
    },
  };

  function handleProviderStart(request: Request, provider: HostedAuthLoginProviderId) {
    const { app, error } = validateRequestClient(request, options);
    const redirectURI = getRedirectURI(request, app);

    if (error) {
      return json({ error }, { status: 400 });
    }
    if (!isRedirectAllowed(redirectURI, app)) {
      return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
    }
    if (!isProviderEnabled(options, provider)) {
      return redirect(createLoginErrorURL(authBaseURL, app.clientId, redirectURI, `${getProviderLabel(provider)} 登录未启用`));
    }

    return betterAuthService.handleProviderStart(request, provider);
  }
}

function handleLogin(
  request: Request,
  options: HostedAuthServiceOptions,
  authBaseURL: string,
) {
  const url = new URL(request.url);
  const { app, error: clientError } = validateRequestClient(request, options);
  const redirectURI = getRedirectURI(request, app);
  const provider = url.searchParams.get("provider");
  const loginError = url.searchParams.get("error") ?? undefined;

  if (clientError) {
    return json({ error: clientError }, { status: 400 });
  }
  if (!isRedirectAllowed(redirectURI, app)) {
    return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
  }
  if (isHostedProvider(provider)) {
    return redirect(createProviderStartUrl(authBaseURL, provider, app.clientId, redirectURI).toString());
  }

  return html(renderLoginPage({
    app,
    authBaseURL,
    clientId: app.clientId,
    enabledProviders: getEnabledProviders(options),
    error: loginError,
    loginPageComponent: options.loginPageComponent,
    redirectURI,
  }));
}

function isHostedProvider(provider: string | null): provider is HostedAuthLoginProviderId {
  return provider === "feishu" || provider === "google" || provider === "github";
}

function getEnabledProviders(options: HostedAuthServiceOptions): HostedAuthLoginProviderId[] {
  return hostedProviders.filter((provider) => isProviderEnabled(options, provider));
}

function isProviderEnabled(options: HostedAuthServiceOptions, provider: HostedAuthLoginProviderId) {
  if (options.config?.providers?.length && !options.config.providers.includes(provider)) {
    return false;
  }

  return options.authProviders?.[provider]?.enabled !== false;
}

function createLoginErrorURL(authBaseURL: string, clientId: string, redirectURI: string, error: string) {
  const url = new URL("/login", authBaseURL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectURI);
  url.searchParams.set("error", error);

  return url.toString();
}

function getProviderLabel(provider: HostedAuthLoginProviderId) {
  if (provider === "feishu") return "飞书";
  if (provider === "google") return "Google";

  return "GitHub";
}
