import type { AuthContext, AuthSession, AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import { getRedirectURI, isRedirectAllowed, validateRequestClient } from "./applications.js";
import { json, redirect } from "./http.js";
import type {
  HostedAuthLoginProviderId,
  HostedAuthServiceOptions,
  HostedBetterAuthSessionResult,
} from "./types.js";

const defaultSocialProviderScopes: Partial<Record<HostedAuthLoginProviderId, string[]>> = {
  github: ["read:user", "user:email"],
  google: ["openid", "email", "profile"],
};

export function createBetterAuthHostedService(options: HostedAuthServiceOptions, authBaseURL: string) {
  const auth = options.auth;

  return {
    handleAuthRequest(request: Request) {
      return auth.handler(request);
    },
    async handleContext(request: Request) {
      const result = await getBetterAuthSession(request, options, authBaseURL);

      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }

      return json(toAuthContext(result.data, result.clientId), {
        headers: result.headers,
      });
    },
    async handleLogout(request: Request) {
      const response = await auth.handler(createBetterAuthRequest(request, authBaseURL, "/api/auth/sign-out", {
        body: {},
        method: "POST",
      }));
      const url = new URL(request.url);

      return redirect(url.searchParams.get("redirect_uri") ?? "/", new Headers(response.headers));
    },
    async handleProviderStart(request: Request, provider: HostedAuthLoginProviderId) {
      const { app, clientId, error } = validateRequestClient(request, options);
      const redirectURI = getRedirectURI(request, app);

      if (error) {
        return json({ error }, { status: 400 });
      }
      if (!isRedirectAllowed(redirectURI, app)) {
        return json({ error: "redirect_uri 不在应用白名单中" }, { status: 400 });
      }

      const response = await auth.handler(createProviderStartRequest(
        request,
        options,
        authBaseURL,
        provider,
        clientId,
        redirectURI,
      ));
      const headers = new Headers(response.headers);
      const providerURL = await readProviderRedirectURL(response);

      if (!response.ok || !providerURL) {
        return redirect(createLoginErrorURL(authBaseURL, clientId, redirectURI, await readBetterAuthError(response, provider)), headers);
      }

      return redirect(providerURL, headers);
    },
    async handleSession(request: Request) {
      const result = await getBetterAuthSession(request, options, authBaseURL);

      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }

      return json(toAuthSession(result.data?.session ?? null, result.clientId), {
        headers: result.headers,
      });
    },
    async handleUser(request: Request) {
      const result = await getBetterAuthSession(request, options, authBaseURL);

      if (result.error) {
        return json({ error: result.error }, { status: 400 });
      }

      return json(toAuthUser(result.data?.user ?? null), {
        headers: result.headers,
      });
    },
  };
}

function createProviderStartRequest(
  request: Request,
  options: HostedAuthServiceOptions,
  authBaseURL: string,
  provider: HostedAuthLoginProviderId,
  clientId: string,
  redirectURI: string,
) {
  const providerId = getBetterAuthProviderId(options, provider);
  const errorCallbackURL = createLoginErrorURL(authBaseURL, clientId, redirectURI);

  if (provider === "feishu") {
    return createBetterAuthRequest(request, authBaseURL, "/api/auth/sign-in/oauth2", {
      body: {
        callbackURL: redirectURI,
        disableRedirect: true,
        errorCallbackURL,
        providerId,
      },
      method: "POST",
    });
  }

  return createBetterAuthRequest(request, authBaseURL, "/api/auth/sign-in/social", {
    body: {
      callbackURL: redirectURI,
      disableRedirect: true,
      errorCallbackURL,
      provider: providerId,
      scopes: getBetterAuthProviderScopes(options, provider),
    },
    method: "POST",
  });
}

function createBetterAuthRequest(
  sourceRequest: Request,
  authBaseURL: string,
  path: string,
  init: {
    body?: unknown;
    method: "GET" | "POST";
  },
) {
  const url = new URL(path, authBaseURL);
  const headers = new Headers(sourceRequest.headers);

  if (init.method !== "GET") {
    headers.set("content-type", "application/json");
    if (!headers.has("origin")) {
      headers.set("origin", new URL(authBaseURL).origin);
    }
  }

  return new Request(url, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers,
    method: init.method,
  });
}

async function getBetterAuthSession(request: Request, options: HostedAuthServiceOptions, authBaseURL: string) {
  const { app, error } = validateRequestClient(request, options);

  if (error) {
    return {
      clientId: app.clientId,
      data: null,
      error,
      headers: new Headers(),
    };
  }

  const response = await options.auth.handler(createBetterAuthRequest(request, authBaseURL, "/api/auth/get-session", {
    method: "GET",
  }));
  const headers = new Headers(response.headers);
  const data = response.ok ? await readBetterAuthSession(response) : null;

  return {
    clientId: app.clientId,
    data,
    error: undefined,
    headers,
  };
}

async function readBetterAuthSession(response: Response): Promise<HostedBetterAuthSessionResult | null> {
  try {
    return await response.json() as HostedBetterAuthSessionResult | null;
  } catch {
    return null;
  }
}

async function readProviderRedirectURL(response: Response) {
  const location = response.headers.get("location");

  if (location) {
    return location;
  }

  try {
    const body = await response.clone().json() as { url?: string };

    return body.url;
  } catch {
    return undefined;
  }
}

async function readBetterAuthError(response: Response, provider: HostedAuthLoginProviderId) {
  try {
    const body = await response.clone().json() as { error?: string; message?: string };

    return body.message ?? body.error ?? `${getProviderLabel(provider)} 登录未配置`;
  } catch {
    return `${getProviderLabel(provider)} 登录未配置`;
  }
}

function getBetterAuthProviderId(options: HostedAuthServiceOptions, provider: HostedAuthLoginProviderId) {
  return options.authProviders?.[provider]?.providerId ?? provider;
}

function getBetterAuthProviderScopes(options: HostedAuthServiceOptions, provider: HostedAuthLoginProviderId) {
  return options.authProviders?.[provider]?.scopes ?? defaultSocialProviderScopes[provider]?.slice();
}

function createLoginErrorURL(authBaseURL: string, clientId: string, redirectURI: string, error?: string) {
  const url = new URL("/login", authBaseURL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectURI);
  if (error) {
    url.searchParams.set("error", error);
  }

  return url.toString();
}

function toAuthContext(data: HostedBetterAuthSessionResult | null, clientId: string): AuthContext {
  return {
    session: toAuthSession(data?.session ?? null, clientId),
    user: toAuthUser(data?.user ?? null),
  };
}

function toAuthSession(session: HostedBetterAuthSessionResult["session"] | null, clientId: string): AuthSession | null {
  if (!session?.userId) {
    return null;
  }

  return {
    clientId,
    expiresAt: normalizeDate(session.expiresAt),
    id: String(session.id ?? session.token ?? ""),
    userId: session.userId,
  };
}

function toAuthUser(user: HostedBetterAuthSessionResult["user"] | null): AuthUser | null {
  if (!user) {
    return null;
  }

  const metadata = Object.fromEntries(
    Object.entries(user).filter(([key]) => !["createdAt", "email", "emailVerified", "id", "image", "name", "updatedAt"].includes(key)),
  );

  return {
    avatarUrl: user.image ?? null,
    email: user.email ?? null,
    id: user.id,
    metadata: Object.keys(metadata).length ? metadata : undefined,
    name: user.name ?? null,
  };
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function getProviderLabel(provider: HostedAuthLoginProviderId) {
  if (provider === "feishu") return "飞书";
  if (provider === "google") return "Google";

  return "GitHub";
}
