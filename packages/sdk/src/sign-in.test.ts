import { describe, expect, it, vi } from "vitest";
import {
  createSignInActions,
  signInWithEmailPassword,
} from "./sign-in";
import type { EmailSignInClient, SignInClient } from "./sign-in";

function createMockClient() {
  const social = vi.fn(async () => ({}));
  const oauth2 = vi.fn(async () => ({}));
  const email = vi.fn(async () => ({}));

  return {
    client: {
      signIn: {
        email,
        oauth2,
        social,
      },
    } as unknown as SignInClient,
    email,
    oauth2,
    social,
  };
}

describe("sign-in helpers", () => {
  it("trims email before password sign-in", async () => {
    const email = vi.fn(async () => ({}));
    const client = { signIn: { email } } as unknown as EmailSignInClient;

    await signInWithEmailPassword(client, {
      email: "  user@example.com ",
      password: "password123",
    });

    expect(email).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("creates compact sign-in actions with useful defaults", async () => {
    const { client, oauth2, social } = createMockClient();
    const actions = createSignInActions(client, {
      baseURL: "https://app.example.com",
    });

    await actions.google();
    await actions.feishu();

    expect(social).toHaveBeenCalledWith({
      callbackURL: "https://app.example.com/",
      errorCallbackURL: "https://app.example.com/login?error=google",
      provider: "google",
    });
    expect(oauth2).toHaveBeenCalledWith({
      callbackURL: "/",
      errorCallbackURL: "/login?error=feishu",
      providerId: "feishu",
    });
  });

  it("lets callers override default callbacks and Feishu provider", async () => {
    const { client, oauth2, social } = createMockClient();
    const actions = createSignInActions(client, {
      callbackURL: "/dashboard",
      feishuProviderId: "feishu-secondary",
    });

    await actions.google({ callbackURL: "/custom" });
    await actions.feishu();

    expect(social).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/custom",
      errorCallbackURL: "http://localhost:3000/login?error=google",
      provider: "google",
    });
    expect(oauth2).toHaveBeenCalledWith({
      callbackURL: "/dashboard",
      errorCallbackURL: "/login?error=feishu-secondary",
      providerId: "feishu-secondary",
    });
  });
});
