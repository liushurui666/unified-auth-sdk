import { describe, expect, it } from "vitest";
import {
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
  createHostedAuthService,
  createMemoryAuthStore,
} from "./index";

function createService() {
  return createHostedAuthService({
    allowedRedirectURIs: ["https://app.example.com/"],
    appName: "Workspace App",
    authBaseURL: "https://auth.example.com",
    clientId: "workspace-app",
    github: {
      clientId: "github-client-id",
      clientSecret: "github-client-secret",
    },
    redirectURI: "https://app.example.com/",
    sessionSecret: "test-secret",
  });
}

describe("hosted auth service", () => {
  it("renders GitHub as a hosted login provider when configured", async () => {
    const response = await createService().handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("Workspace App 统一登录");
    expect(body).toContain("<span class=\"provider-name\">GitHub</span>");
    expect(body).toContain("首次使用会自动完成账号创建和身份绑定");
    expect(body).not.toContain("mode-tab");
    expect(body).not.toContain("去注册");
    expect(body).toContain(
      "https://auth.example.com/api/auth/github/start?client_id=workspace-app&amp;redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
  });

  it("treats old registration mode links as the same hosted login page", async () => {
    const response = await createService().handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F&mode=register"),
    );
    const body = await response.text();

    expect(body).toContain("Workspace App 统一登录");
    expect(body).toContain("<span class=\"provider-name\">GitHub</span>");
    expect(body).not.toContain("创建 Workspace App 账号");
    expect(body).not.toContain("mode-tab");
    expect(body).not.toContain("provider-note");
  });

  it("allows the embedded application to customize the login background image", async () => {
    const service = createHostedAuthService({
      allowedRedirectURIs: ["https://app.example.com/"],
      appearance: {
        backgroundImageUrl: "https://cdn.example.com/auth/login-bg.jpg",
      },
      appName: "Workspace App",
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      github: {
        clientId: "github-client-id",
        clientSecret: "github-client-secret",
      },
      redirectURI: "https://app.example.com/",
      sessionSecret: "test-secret",
    });
    const response = await service.handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("--auth-background-image: url(&#39;https://cdn.example.com/auth/login-bg.jpg&#39;)");
  });

  it("renders the hosted login page through a configurable component", async () => {
    const service = createHostedAuthService({
      allowDevLogin: true,
      allowedRedirectURIs: ["https://app.example.com/"],
      appName: "Workspace App",
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      feishu: {
        appId: "feishu-client-id",
        appSecret: "feishu-client-secret",
      },
      github: {
        clientId: "github-client-id",
        clientSecret: "github-client-secret",
      },
      loginPageComponent: createHostedAuthLoginPageComponent({
        backgroundImageUrl: "https://cdn.example.com/auth/component-bg.jpg",
        brandLabel: "企业协作入口",
        brandName: "AI 项目管理平台",
        devLoginLabel: "使用开发身份进入",
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
      sessionSecret: "test-secret",
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
    expect(body).toContain("使用开发身份进入");
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
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      github: {
        clientId: "github-client-id",
        clientSecret: "github-client-secret",
      },
      loginPageComponent({ model }) {
        const github = model.providers.find((provider) => provider.id === "github");

        return `<!doctype html><title>${model.appName}</title><a href="${github?.href ?? ""}">${github?.label ?? ""}</a>`;
      },
      redirectURI: "https://app.example.com/",
      sessionSecret: "test-secret",
    });
    const response = await service.handleLogin(
      new Request("https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const body = await response.text();

    expect(body).toContain("<title>Workspace App</title>");
    expect(body).toContain("https://auth.example.com/api/auth/github/start?client_id=workspace-app");
  });

  it("starts the GitHub OAuth web application flow", async () => {
    const response = await createService().handleGitHubStart(
      new Request("https://auth.example.com/api/auth/github/start?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const location = response.headers.get("location");
    const redirectURL = new URL(location ?? "");

    expect(response.status).toBe(302);
    expect(redirectURL.origin + redirectURL.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(redirectURL.searchParams.get("client_id")).toBe("github-client-id");
    expect(redirectURL.searchParams.get("redirect_uri")).toBe("https://auth.example.com/api/auth/github/callback");
    expect(redirectURL.searchParams.get("scope")).toBe("read:user user:email");
    expect(response.headers.get("set-cookie")).toContain("unified_auth_state=");
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
      authBaseURL: "http://localhost:3004",
      clientId: "ai-pm",
      github: {
        clientId: "github-client-id",
        clientSecret: "github-client-secret",
      },
      redirectURI: "http://localhost:3004/",
      sessionSecret: "test-secret",
      store: createMemoryAuthStore(),
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
    expect(startResponse.headers.get("location")).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3004%2Fapi%2Fauth%2Fgithub%2Fcallback",
    );
  });

  it("persists hosted sessions with a canonical auth user id", async () => {
    const service = createHostedAuthService({
      allowDevLogin: true,
      allowedRedirectURIs: ["https://app.example.com/"],
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      redirectURI: "https://app.example.com/",
      sessionSecret: "test-secret",
      store: createMemoryAuthStore(),
    });
    const loginResponse = await service.handleDevLogin(
      new Request("https://auth.example.com/api/auth/dev-login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F"),
    );
    const cookie = loginResponse.headers.get("set-cookie")?.match(/unified_auth_session=[^;]+/)?.[0] ?? "";
    const contextResponse = await service.handleContext(
      new Request("https://auth.example.com/api/auth/context", {
        headers: { cookie },
      }),
    );
    const context = await contextResponse.json();

    expect(context.user.id).toMatch(/^auth_/);
    expect(context.user.id).not.toBe("dev-user");
    expect(context.user.metadata.provider).toBe("dev");
    expect(context.user.metadata.providerUserId).toBe("dev-user");
    expect(context.user.metadata.registrationChannel).toBe("dev");
    expect(context.session.userId).toBe(context.user.id);
  });

  it("binds OAuth accounts with the same email to the first auth user", async () => {
    const store = createMemoryAuthStore();
    const googleUser = await store.upsertOAuthUser("google", {
      email: "person@example.com",
      id: "google-sub-1",
      metadata: { provider: "google" },
      name: "Google Person",
    });
    const githubUser = await store.upsertOAuthUser("github", {
      email: "PERSON@example.com",
      id: "github:42",
      metadata: { provider: "github" },
      name: "github-person",
    });

    expect(githubUser.id).toBe(googleUser.id);
    expect(githubUser.metadata?.provider).toBe("github");
    expect(githubUser.metadata?.registrationChannel).toBe("google");
  });
});
