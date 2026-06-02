export type AuthProviderId = "email" | "feishu" | "github" | "google" | (string & {});

export interface AuthAppearanceConfig {
  logoUrl?: string;
  primaryColor?: string;
  providers?: AuthProviderId[];
  radius?: number;
  theme?: "dark" | "light" | "system";
  title?: string;
}

export interface AuthApplicationConfig {
  allowedRedirectURIs?: string[];
  appearance?: AuthAppearanceConfig;
  authBaseURL: string;
  clientId: string;
  name?: string;
}

export interface AuthUser {
  avatarUrl?: string | null;
  email?: string | null;
  id: string;
  metadata?: Record<string, unknown>;
  name?: string | null;
}

export interface AuthSession {
  clientId: string;
  expiresAt?: string | null;
  id: string;
  userId: string;
}

export interface AuthContext {
  session: AuthSession | null;
  user: AuthUser | null;
}

export interface AuthServiceClientEndpoints {
  authContext: string;
  login: string;
  logout: string;
  session: string;
  user: string;
}

export interface CreateAuthServiceClientOptions {
  authBaseURL: string;
  clientId: string;
  defaultRedirectURI?: string;
  endpoints?: Partial<AuthServiceClientEndpoints>;
  fetcher?: typeof fetch;
}

export interface LoginOptions {
  provider?: AuthProviderId;
  redirectURI?: string;
}

export interface LogoutOptions {
  redirectURI?: string;
}

export interface AuthServiceClient {
  getAuthContext(): Promise<AuthContext>;
  getCurrentUser(): Promise<AuthUser | null>;
  getLoginURL(options?: LoginOptions): string;
  getLogoutURL(options?: LogoutOptions): string;
  getSession(): Promise<AuthSession | null>;
  login(options?: LoginOptions): string;
  logout(options?: LogoutOptions): string;
}

const defaultEndpoints: AuthServiceClientEndpoints = {
  authContext: "/api/auth/context",
  login: "/login",
  logout: "/logout",
  session: "/api/auth/session",
  user: "/api/auth/me",
};

// Core SDK 只负责和黑盒 Auth Service 通信，不持有 secret，也不接管业务方的用户/权限表。
function normalizeBaseURL(baseURL: string): string {
  return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
}

function assignLocation(url: string): void {
  if (typeof window !== "undefined") {
    window.location.assign(url);
  }
}

export function createAuthServiceClient(
  options: CreateAuthServiceClientOptions,
): AuthServiceClient {
  const endpoints = { ...defaultEndpoints, ...options.endpoints };
  const baseURL = normalizeBaseURL(options.authBaseURL);
  const fetcher = options.fetcher ?? fetch;

  // 所有请求都显式带上 client_id，让一个 Auth Service 可以服务多个业务应用。
  function buildURL(path: string, params: Record<string, string | undefined> = {}): string {
    const url = new URL(path.replace(/^\/+/, ""), baseURL);
    url.searchParams.set("client_id", options.clientId);

    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  async function requestJSON<T>(
    path: string,
    init?: RequestInit,
    params?: Record<string, string | undefined>,
  ): Promise<T> {
    const response = await fetcher(buildURL(path, params), {
      credentials: "include",
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Auth service request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  function resolveRedirectURI(redirectURI?: string): string | undefined {
    return redirectURI ?? options.defaultRedirectURI;
  }

  return {
    getAuthContext() {
      return requestJSON<AuthContext>(endpoints.authContext);
    },
    getCurrentUser() {
      return requestJSON<AuthUser | null>(endpoints.user);
    },
    getLoginURL(loginOptions = {}) {
      return buildURL(endpoints.login, {
        provider: loginOptions.provider,
        redirect_uri: resolveRedirectURI(loginOptions.redirectURI),
      });
    },
    getLogoutURL(logoutOptions = {}) {
      return buildURL(endpoints.logout, {
        redirect_uri: resolveRedirectURI(logoutOptions.redirectURI),
      });
    },
    getSession() {
      return requestJSON<AuthSession | null>(endpoints.session);
    },
    login(loginOptions = {}) {
      const url = this.getLoginURL(loginOptions);
      assignLocation(url);
      return url;
    },
    logout(logoutOptions = {}) {
      const url = this.getLogoutURL(logoutOptions);
      assignLocation(url);
      return url;
    },
  };
}
