import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import { createProviderStartUrl, getApplication, getClientId, getRedirectURI, isRedirectAllowed, normalizeBaseURL } from "./applications.js";
import { AUTH_SERVICE_SESSION_COOKIE, AUTH_SERVICE_STATE_COOKIE } from "./constants.js";
import { appendCookie, clearCookie, createSessionCookie } from "./cookies.js";
import { html, json, redirect } from "./http.js";
import { renderLoginPage } from "./login-page/index.js";
import { createOAuthState, createOAuthStateCookie, readOAuthCallbackState } from "./oauth.js";
import { createUserFromFeishuCode } from "./providers/feishu.js";
import { createUserFromGitHubCode } from "./providers/github.js";
import { createUserFromGoogleCode } from "./providers/google.js";
import {
  createSessionExpiresAt,
  createSessionPayload,
  deleteRequestSession,
  getStoredSession,
  toAuthContext,
  toAuthSession,
} from "./session.js";
import { createMemoryAuthStore } from "./store/index.js";
import type { HostedAuthProviderId } from "./store/index.js";
import type { HostedAuthApplication, HostedAuthServiceOptions } from "./types.js";

type ProviderId = Exclude<HostedAuthProviderId, "dev">;

export function createHostedAuthService(options: HostedAuthServiceOptions) {
  const authBaseURL = normalizeBaseURL(options.authBaseURL);
  const allowDevLogin = options.allowDevLogin ?? false;
  const store = options.store ?? createMemoryAuthStore();

  // OAuth 成功后只写认证身份和 session；业务角色、项目、成员关系仍由业务系统自己维护。
  async function setSessionAndRedirect(
    request: Request,
    provider: HostedAuthProviderId,
    providerUser: AuthUser,
    clientId: string,
    redirectURI: string,
  ) {
    const user = await store.upsertOAuthUser(provider, providerUser);
    const session = await store.createSession({
      clientId,
      expiresAt: createSessionExpiresAt(),
      provider,
      providerAccountId: providerUser.id,
      userId: user.id,
    });
    const headers = new Headers();

    appendCookie(headers, createSessionCookie(request, options, createSessionPayload(session)));
    appendCookie(headers, clearCookie(request, options, AUTH_SERVICE_STATE_COOKIE));

    return redirect(redirectURI, headers);
  }

  async function handleProviderCallback(
    request: Request,
    provider: ProviderId,
    createUser: (code: string, callbackURL: string) => Promise<AuthUser>,
  ) {
    const stateData = readOAuthCallbackState(request, options);

    if (!stateData) {
      return redirect(`${authBaseURL}/login?error=${encodeURIComponent("登录状态校验失败，请重新发起登录。")}`);
    }

    try {
      const user = await createUser(stateData.code, getCallbackURL(provider));

      return setSessionAndRedirect(request, provider, user, stateData.savedState.clientId, stateData.savedState.redirectURI);
    } catch (error) {
      return redirect(createCallbackErrorUrl(provider, error, stateData.savedState.clientId, stateData.savedState.redirectURI));
    }
  }

  function handleProviderStart(request: Request, provider: ProviderId) {
    const providerClientId = getProviderClientId(provider);
    const clientId = getClientId(request, options);
    const app = getApplication(options, clientId);
    const redirectURI = getRedirectURI(request, app);

    if (!providerClientId) {
      return redirect(`${authBaseURL}/login?client_id=${encodeURIComponent(clientId)}&error=${encodeURIComponent(getProviderDisabledMessage(provider))}`);
    }
    if (!isRedirectAllowed(redirectURI, app)) {
      return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
    }

    return redirectToProvider(request, app, redirectURI, provider, providerClientId);
  }

  return {
    async handleContext(request: Request) {
      return json(toAuthContext(await getStoredSession(request, options, store)));
    },
    async handleDevLogin(request: Request) {
      return handleDevLogin(request, options, allowDevLogin, setSessionAndRedirect);
    },
    async handleFeishuCallback(request: Request) {
      return handleProviderCallback(request, "feishu", (code) => createUserFromFeishuCode(options, code));
    },
    async handleFeishuStart(request: Request) {
      return handleProviderStart(request, "feishu");
    },
    async handleGitHubCallback(request: Request) {
      return handleProviderCallback(request, "github", (code, callbackURL) =>
        createUserFromGitHubCode(options, code, callbackURL));
    },
    async handleGitHubStart(request: Request) {
      return handleProviderStart(request, "github");
    },
    async handleGoogleCallback(request: Request) {
      return handleProviderCallback(request, "google", (code, callbackURL) =>
        createUserFromGoogleCode(options, code, callbackURL));
    },
    async handleGoogleStart(request: Request) {
      return handleProviderStart(request, "google");
    },
    async handleLogin(request: Request) {
      return handleLogin(request, options, authBaseURL, allowDevLogin);
    },
    async handleLogout(request: Request) {
      const url = new URL(request.url);
      const headers = new Headers();

      await deleteRequestSession(request, options, store);
      appendCookie(headers, clearCookie(request, options, options.cookieName ?? AUTH_SERVICE_SESSION_COOKIE));

      return redirect(url.searchParams.get("redirect_uri") ?? "/", headers);
    },
    async handleSession(request: Request) {
      const stored = await getStoredSession(request, options, store);

      return json(stored ? toAuthSession(stored.session) : null);
    },
    async handleUser(request: Request) {
      return json((await getStoredSession(request, options, store))?.user ?? null);
    },
  };

  function getCallbackURL(provider: ProviderId) {
    return options[provider]?.redirectURI ?? `${authBaseURL}/api/auth/${provider}/callback`;
  }

  function getProviderClientId(provider: ProviderId) {
    return provider === "feishu" ? options.feishu?.appId : options[provider]?.clientId;
  }

  function redirectToProvider(
    request: Request,
    app: HostedAuthApplication,
    redirectURI: string,
    provider: ProviderId,
    providerClientId: string,
  ) {
    const { payload, state } = createOAuthState(app, redirectURI);
    const authorizeUrl = createProviderAuthorizeUrl(provider, providerClientId, getCallbackURL(provider), state);
    const headers = new Headers();

    // state 写入签名 cookie，回调时校验 client/redirect，避免被篡改跳转目标。
    appendCookie(headers, createOAuthStateCookie(request, options, payload));

    return redirect(authorizeUrl.toString(), headers);
  }

  function createProviderAuthorizeUrl(provider: ProviderId, clientId: string, callbackURL: string, state: string) {
    if (provider === "feishu") return createFeishuAuthorizeUrl(clientId, callbackURL, state);
    if (provider === "google") return createGoogleAuthorizeUrl(clientId, callbackURL, state);

    return createGitHubAuthorizeUrl(clientId, callbackURL, state);
  }

  function createCallbackErrorUrl(provider: ProviderId, error: unknown, clientId: string, redirectURI: string) {
    const message = error instanceof Error ? error.message : `${getProviderLabel(provider)} 登录失败`;

    return `${authBaseURL}/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectURI)}&error=${encodeURIComponent(message)}`;
  }

  function createGoogleAuthorizeUrl(clientId: string, callbackURL: string, state: string) {
    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    authorizeUrl.searchParams.set("access_type", "offline");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("prompt", "select_account");
    authorizeUrl.searchParams.set("redirect_uri", callbackURL);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", (options.google?.scopes ?? ["openid", "email", "profile"]).join(" "));
    authorizeUrl.searchParams.set("state", state);

    return authorizeUrl;
  }

  function createGitHubAuthorizeUrl(clientId: string, callbackURL: string, state: string) {
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackURL);
    authorizeUrl.searchParams.set("scope", (options.github?.scopes ?? ["read:user", "user:email"]).join(" "));
    authorizeUrl.searchParams.set("state", state);

    return authorizeUrl;
  }
}

function createFeishuAuthorizeUrl(appId: string, callbackURL: string, state: string) {
  const authorizeUrl = new URL("https://open.feishu.cn/open-apis/authen/v1/index");

  authorizeUrl.searchParams.set("app_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", callbackURL);
  authorizeUrl.searchParams.set("state", state);

  return authorizeUrl;
}

function getProviderDisabledMessage(provider: ProviderId) {
  return `${getProviderLabel(provider)} 登录未配置`;
}

function getProviderLabel(provider: ProviderId) {
  if (provider === "feishu") return "飞书";
  if (provider === "google") return "Google";

  return "GitHub";
}

function handleDevLogin(
  request: Request,
  options: HostedAuthServiceOptions,
  allowDevLogin: boolean,
  setSessionAndRedirect: (
    request: Request,
    provider: HostedAuthProviderId,
    user: AuthUser,
    clientId: string,
    redirectURI: string,
  ) => Promise<Response>,
) {
  if (!allowDevLogin) {
    return json({ error: "开发登录未启用" }, { status: 403 });
  }

  const clientId = getClientId(request, options);
  const app = getApplication(options, clientId);
  const redirectURI = getRedirectURI(request, app);

  if (!isRedirectAllowed(redirectURI, app)) {
    return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
  }

  return setSessionAndRedirect(
    request,
    "dev",
    {
      email: "dev@example.com",
      id: "dev-user",
      metadata: { provider: "dev" },
      name: "开发账号",
    },
    app.clientId,
    redirectURI,
  );
}

function handleLogin(
  request: Request,
  options: HostedAuthServiceOptions,
  authBaseURL: string,
  allowDevLogin: boolean,
) {
  const url = new URL(request.url);
  const clientId = getClientId(request, options);
  const app = getApplication(options, clientId);
  const redirectURI = getRedirectURI(request, app);
  const provider = url.searchParams.get("provider");
  const error = url.searchParams.get("error") ?? undefined;

  if (!isRedirectAllowed(redirectURI, app)) {
    return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
  }
  if (isHostedProvider(provider)) {
    return redirect(createProviderStartUrl(authBaseURL, provider, app.clientId, redirectURI).toString());
  }

    return html(renderLoginPage({
      allowDevLogin,
      app,
      appearance: options.appearance,
      authBaseURL,
      clientId: app.clientId,
      error,
      feishuEnabled: Boolean(options.feishu?.appId && options.feishu?.appSecret),
      githubEnabled: Boolean(options.github?.clientId && options.github?.clientSecret),
      googleEnabled: Boolean(options.google?.clientId && options.google?.clientSecret),
      loginPage: options.loginPage,
      loginPageComponent: options.loginPageComponent,
      redirectURI,
    }));
}

function isHostedProvider(provider: string | null): provider is ProviderId {
  return provider === "feishu" || provider === "google" || provider === "github";
}
