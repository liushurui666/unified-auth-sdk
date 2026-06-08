import { describe, expect, it, vi } from "vitest";
import { createAuthServiceClient } from "./service-client";

describe("auth service client", () => {
  it("builds hosted login and logout URLs with client context", () => {
    const client = createAuthServiceClient({
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      defaultRedirectURI: "https://app.example.com/auth/callback",
    });

    expect(client.getLoginURL({ provider: "feishu" })).toBe(
      "https://auth.example.com/login?client_id=workspace-app&provider=feishu&redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fcallback",
    );
    expect(client.getLogoutURL({ redirectURI: "https://app.example.com" })).toBe(
      "https://auth.example.com/logout?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com",
    );
  });

  it("passes client_id to user query methods", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(JSON.stringify({ id: "auth-user" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    const client = createAuthServiceClient({
      authBaseURL: "https://auth.example.com",
      clientId: "workspace-app",
      fetcher,
    });

    await expect(client.getCurrentUser()).resolves.toEqual({ id: "auth-user" });

    const url = fetcher.mock.calls[0]?.[0];
    expect(url).toBe(
      "https://auth.example.com/api/auth/me?client_id=workspace-app",
    );
  });

  it("can derive client config from runtime env", () => {
    const client = createAuthServiceClient({
      env: {
        AUTH_ALLOWED_REDIRECT_URI: "https://app.example.com/",
        AUTH_CLIENT_ID: "workspace-app",
        AUTH_SERVICE_URL: "https://auth.example.com",
      },
    });

    expect(client.getLoginURL()).toBe(
      "https://auth.example.com/login?client_id=workspace-app&redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
  });

  it("can derive client config from unified auth config", () => {
    const client = createAuthServiceClient({
      config: {
        app: {
          id: "workspace-app",
          origin: "https://app.example.com",
          redirectURI: "https://app.example.com/",
        },
        auth: {
          origin: "https://auth.example.com",
        },
      },
    });

    expect(client.getLoginURL({ provider: "github" })).toBe(
      "https://auth.example.com/login?client_id=workspace-app&provider=github&redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
  });
});
