import { describe, expect, it } from "vitest";
import {
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
  createHostedAuthService,
} from "./index";
import type { HostedBetterAuthServer } from "./index";

function createFakeBetterAuth(
  handler: (request: Request) => Response | Promise<Response>,
): HostedBetterAuthServer {
  return {
    handler,
  };
}

function createService(handler: (request: Request) => Response | Promise<Response> = () => new Response("handled")) {
  return createHostedAuthService({
    allowedRedirectURIs: ["https://app.example.com/"],
    appName: "Workspace App",
    auth: createFakeBetterAuth(handler),
    authBaseURL: "https://auth.example.com",
    clientId: "workspace-app",
    redirectURI: "https://app.example.com/",
  });
}

describe("hosted auth service", () => {
  it("renders Better Auth providers on the hosted login page", async () => {
    const response = await createService().handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("Workspace App 统一登录");
    expect(body).toContain("<span class=\"provider-name\">飞书</span>");
    expect(body).toContain("<span class=\"provider-name\">Google</span>");
    expect(body).toContain("<span class=\"provider-name\">GitHub</span>");
    expect(body).toContain("首次使用会自动完成账号创建和身份绑定");
    expect(body).not.toContain("dev-link");
    expect(body).toContain(
      "https://auth.example.com/api/auth/github/start?client_id=workspace-app&amp;redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
  });

  it("renders the hosted login page through a configurable component", async () => {
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(() => new Response("handled")),
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      loginPageComponent: createHostedAuthLoginPageComponent({
        backgroundImageUrl: "https://cdn.example.com/auth/component-bg.jpg",
        brandLabel: "企业协作入口",
        brandName: "AI 项目管理平台",
        footerText: "Powered by Unified Auth",
        heroDescription: "统一身份校验后进入项目驾驶舱。",
        heroTitle: "欢迎回到项目驾驶舱",
        logoUrl: "https://cdn.example.com/auth/logo.png",
        panelDescription: "使用企业授权账号完成登录。",
        panelTitle: "用 GitHub 进入",
        primaryProvider: "github",
        providers: ["github"],
        statusText: "企业 SSO",
      }),
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("欢迎回到项目驾驶舱");
    expect(body).toContain("统一身份校验后进入项目驾驶舱。");
    expect(body).toContain("用 GitHub 进入");
    expect(body).toContain("使用企业授权账号完成登录。");
    expect(body).toContain("企业 SSO");
    expect(body).toContain("Powered by Unified Auth");
    expect(body).toContain("src=\"https://cdn.example.com/auth/logo.png\"");
    expect(body).toContain("--auth-background-image: url(&#39;https://cdn.example.com/auth/component-bg.jpg&#39;)");
    expect(body).toContain("https://auth.example.com/api/auth/github/start?client_id=workspace-app");
    expect(body).not.toContain("https://auth.example.com/api/auth/feishu/start?client_id=workspace-app");
  });

  it("lets a custom login page component render the SDK generated auth model", async () => {
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(() => new Response("handled")),
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      loginPageComponent({ model }) {
        const github = model.providers.find((provider) => provider.id === "github");

        return `<!doctype html><title>${model.appName}</title><a href="${github?.href ?? ""}">${github?.label ?? ""}</a>`;
      },
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("<title>Workspace App</title>");
    expect(body).toContain("https://auth.example.com/api/auth/github/start?client_id=workspace-app");
  });

  it("delegates social provider start to Better Auth", async () => {
    const calls: Array<{
      body: unknown;
      path: string;
    }> = [];
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(async (request) => {
        const url = new URL(request.url);
        calls.push({
          body: await request.json(),
          path: url.pathname,
        });

        return new Response(JSON.stringify({
          redirect: false,
          url: "https://github.com/login/oauth/authorize?state=better-auth-state",
        }), {
          headers: {
            "content-type": "application/json",
            "set-cookie": "better-auth.state=state-value; Path=/api/auth; HttpOnly",
          },
        });
      }),
      authBaseURL: "https://auth.example.com",
      authProviders: {
        github: {
          scopes: ["read:user", "user:email"],
        },
      },
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleGitHubStart(
      new Request("https://auth.example.com/api/auth/github/start?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://github.com/login/oauth/authorize?state=better-auth-state");
    expect(response.headers.get("set-cookie")).toContain("better-auth.state=state-value");
    expect(calls).toEqual([
      {
        body: {
          callbackURL: "https://app.example.com/",
          disableRedirect: true,
          errorCallbackURL: "https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F",
          provider: "github",
          scopes: ["read:user", "user:email"],
        },
        path: "/api/auth/sign-in/social",
      },
    ]);
  });

  it("requests default profile scopes for social provider start", async () => {
    const calls: Array<{
      body: unknown;
      path: string;
    }> = [];
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(async (request) => {
        const url = new URL(request.url);
        calls.push({
          body: await request.json(),
          path: url.pathname,
        });

        return Response.json({
          redirect: false,
          url: "https://accounts.google.com/o/oauth2/v2/auth?state=better-auth-state",
        });
      }),
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleGoogleStart(
      new Request("https://auth.example.com/api/auth/google/start?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=better-auth-state");
    expect(calls).toEqual([
      {
        body: {
          callbackURL: "https://app.example.com/",
          disableRedirect: true,
          errorCallbackURL: "https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F",
          provider: "google",
          scopes: ["openid", "email", "profile"],
        },
        path: "/api/auth/sign-in/social",
      },
    ]);
  });

  it("delegates Feishu start to Better Auth generic OAuth with provider mapping", async () => {
    const calls: Array<{
      body: unknown;
      path: string;
    }> = [];
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(async (request) => {
        const url = new URL(request.url);
        calls.push({
          body: await request.json(),
          path: url.pathname,
        });

        return Response.json({
          redirect: false,
          url: "https://open.feishu.cn/open-apis/authen/v1/index?state=better-auth-state",
        });
      }),
      authBaseURL: "https://auth.example.com",
      authProviders: {
        feishu: {
          providerId: "feishu-primary",
        },
      },
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleFeishuStart(
      new Request("https://auth.example.com/api/auth/feishu/start?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("https://open.feishu.cn/open-apis/authen/v1/index");
    expect(calls).toEqual([
      {
        body: {
          callbackURL: "https://app.example.com/",
          disableRedirect: true,
          errorCallbackURL: "https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F",
          providerId: "feishu-primary",
        },
        path: "/api/auth/sign-in/oauth2",
      },
    ]);
  });

  it("maps Better Auth session data to the SDK auth context shape", async () => {
    const service = createService(async (request) => {
      expect(new URL(request.url).pathname).toBe("/api/auth/get-session");

      return new Response(JSON.stringify({
        session: {
          expiresAt: "2026-06-10T00:00:00.000Z",
          id: "session_123",
          userId: "user_123",
        },
        user: {
          email: "person@example.com",
          feishuTenantKey: "tenant-key",
          id: "user_123",
          image: "https://cdn.example.com/avatar.png",
          name: "Person",
        },
      }), {
        headers: {
          "content-type": "application/json",
          "set-cookie": "better-auth.session=fresh; Path=/; HttpOnly",
        },
      });
    });
    const response = await service.handleContext(
      new Request("https://auth.example.com/api/auth/context?client_id=workspace-app", {
        headers: {
          cookie: "better-auth.session=old",
        },
      }),
    );
    const context = await response.json();

    expect(response.headers.get("set-cookie")).toContain("better-auth.session=fresh");
    expect(context).toEqual({
      session: {
        clientId: "workspace-app",
        expiresAt: "2026-06-10T00:00:00.000Z",
        id: "session_123",
        userId: "user_123",
      },
      user: {
        avatarUrl: "https://cdn.example.com/avatar.png",
        email: "person@example.com",
        id: "user_123",
        metadata: {
          feishuTenantKey: "tenant-key",
        },
        name: "Person",
      },
    });
  });

  it("passes Better Auth callback routes through unchanged", async () => {
    const paths: string[] = [];
    const handlers = createHostedAuthRouteHandlers({
      allowedRedirectURIs: ["https://app.example.com/"],
      auth: createFakeBetterAuth((request) => {
        paths.push(new URL(request.url).pathname);

        return new Response("handled");
      }),
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
    });

    await handlers.GET(new Request("https://auth.example.com/api/auth/oauth2/callback/feishu-primary?code=abc&state=123"));
    await handlers.GET(new Request("https://auth.example.com/api/auth/callback/google?code=abc&state=123"));

    expect(paths).toEqual([
      "/api/auth/oauth2/callback/feishu-primary",
      "/api/auth/callback/google",
    ]);
  });

  it("rejects requests for a different client id", async () => {
    const response = await createService().handleGitHubStart(
      new Request("https://auth.example.com/api/auth/github/start?client_id=unknown-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("client_id unknown-app is not configured");
  });

  it("dispatches embedded business app routes", async () => {
    const handlers = createHostedAuthRouteHandlers({
      allowedRedirectURIs: ["http://localhost:3004/"],
      appName: "AI PM",
      auth: createFakeBetterAuth(async (request) => {
        if (new URL(request.url).pathname === "/api/auth/sign-in/social") {
          return Response.json({
            redirect: false,
            url: "https://github.com/login/oauth/authorize?state=better-auth-state",
          });
        }

        return new Response("handled");
      }),
      authBaseURL: "http://localhost:3004",
      clientId: "ai-pm",
      redirectURI: "http://localhost:3004/",
    });
    const loginResponse = await handlers.GET(
      new Request("http://localhost:3004/login?client_id=ai-pm&redirect_uri=http%3A%2F%2Flocalhost%3A3004%2F"),
    );
    const body = await loginResponse.text();
    const startResponse = await handlers.GET(
      new Request("http://localhost:3004/api/auth/github/start?client_id=ai-pm&redirect_uri=http%3A%2F%2Flocalhost%3A3004%2F"),
    );

    expect(body).toContain("AI PM 统一登录");
    expect(body).toContain("http://localhost:3004/api/auth/github/start");
    expect(startResponse.headers.get("location")).toBe(
      "https://github.com/login/oauth/authorize?state=better-auth-state",
    );
  });

  it("keeps runtime env as an explicit fallback", async () => {
    const handlers = createHostedAuthRouteHandlers({
      auth: createFakeBetterAuth(async (request) => {
        if (new URL(request.url).pathname === "/api/auth/sign-in/social") {
          return Response.json({
            redirect: false,
            url: "https://github.com/login/oauth/authorize?state=env-state",
          });
        }

        return new Response("handled");
      }),
      env: {
        AUTH_ALLOWED_REDIRECT_URI: "http://localhost:3004/",
        AUTH_CLIENT_ID: "ai-pm",
        AUTH_CLIENT_NAME: "AI PM",
        AUTH_SERVICE_URL: "http://localhost:3004",
      },
    });
    const loginResponse = await handlers.GET(new Request("http://localhost:3004/login"));
    const body = await loginResponse.text();
    const startResponse = await handlers.GET(new Request("http://localhost:3004/api/auth/github/start"));

    expect(body).toContain("AI PM 统一登录");
    expect(body).toContain("client_id=ai-pm");
    expect(body).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3004%2F");
    expect(startResponse.headers.get("location")).toBe(
      "https://github.com/login/oauth/authorize?state=env-state",
    );
  });

  it("derives embedded route config from unified auth config", async () => {
    const handlers = createHostedAuthRouteHandlers({
      auth: createFakeBetterAuth(async (request) => {
        if (new URL(request.url).pathname === "/api/auth/sign-in/social") {
          return Response.json({
            redirect: false,
            url: "https://github.com/login/oauth/authorize?state=config-state",
          });
        }

        return new Response("handled");
      }),
      config: {
        app: {
          id: "ai-pm",
          name: "AI PM",
          origin: "http://localhost:3004",
          redirectURI: "http://localhost:3004/",
        },
        providers: ["github"],
        realm: "ai-pm",
      },
    });
    const loginResponse = await handlers.GET(new Request("http://localhost:3004/login"));
    const body = await loginResponse.text();
    const startResponse = await handlers.GET(new Request("http://localhost:3004/api/auth/github/start"));

    expect(body).toContain("AI PM 统一登录");
    expect(body).toContain("client_id=ai-pm");
    expect(body).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3004%2F");
    expect(body).toContain("<span class=\"provider-name\">GitHub</span>");
    expect(body).not.toContain("<span class=\"provider-name\">飞书</span>");
    expect(startResponse.headers.get("location")).toBe(
      "https://github.com/login/oauth/authorize?state=config-state",
    );
  });

  it("hides providers explicitly disabled for Better Auth", async () => {
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      auth: createFakeBetterAuth(() => new Response("handled")),
      authBaseURL: "https://auth.example.com",
      authProviders: {
        github: {
          enabled: false,
        },
      },
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
    });
    const response = await service.handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).not.toContain("<span class=\"provider-name\">GitHub</span>");
    expect(body).toContain("<span class=\"provider-name\">Google</span>");
  });
});
