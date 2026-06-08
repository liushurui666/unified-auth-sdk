import { toAbsoluteUrl } from "./redirect.js";

export type AuthCallResult = Promise<{ error?: { message?: string | null } | null }>;

export interface SocialSignInClient {
  signIn: {
    social(input: {
      callbackURL: string;
      errorCallbackURL?: string;
      provider: string;
    }): AuthCallResult;
  };
}

export interface OAuth2SignInClient {
  signIn: {
    oauth2(input: {
      callbackURL: string;
      errorCallbackURL?: string;
      providerId: string;
    }): AuthCallResult;
  };
}

export interface EmailSignInClient {
  signIn: {
    email(input: {
      email: string;
      password: string;
    }): AuthCallResult;
  };
}

export interface GoogleSignInOptions {
  baseURL?: string;
  callbackURL: string;
  errorCallbackURL?: string;
  provider?: "google";
}

export async function signInWithGoogle(
  authClient: SocialSignInClient,
  options: GoogleSignInOptions,
) {
  return authClient.signIn.social({
    callbackURL: toAbsoluteUrl(options.callbackURL, options.baseURL),
    errorCallbackURL: toAbsoluteUrl(
      options.errorCallbackURL ?? "/login?error=google",
      options.baseURL,
    ),
    provider: options.provider ?? "google",
  });
}

export interface FeishuSignInOptions {
  callbackURL: string;
  errorCallbackURL?: string;
  providerId?: string;
}

export async function signInWithFeishu(
  authClient: OAuth2SignInClient,
  options: FeishuSignInOptions,
) {
  const providerId = options.providerId ?? "feishu";
  return authClient.signIn.oauth2({
    callbackURL: options.callbackURL,
    errorCallbackURL: options.errorCallbackURL ?? `/login?error=${encodeURIComponent(providerId)}`,
    providerId,
  });
}

export interface EmailPasswordSignInOptions {
  email: string;
  password: string;
}

export async function signInWithEmailPassword(
  authClient: EmailSignInClient,
  options: EmailPasswordSignInOptions,
) {
  return authClient.signIn.email({
    email: options.email.trim(),
    password: options.password,
  });
}

export const DEFAULT_SIGN_IN_CALLBACK_URL = "/";

export type SignInClient = SocialSignInClient & OAuth2SignInClient & EmailSignInClient;

export interface CreateSignInActionsOptions {
  baseURL?: string;
  callbackURL?: string;
  errorCallbackURL?: string;
  feishuProviderId?: string;
}

export interface SignInActions {
  email(options: EmailPasswordSignInOptions): AuthCallResult;
  feishu(options?: Partial<FeishuSignInOptions>): AuthCallResult;
  google(options?: Partial<GoogleSignInOptions>): AuthCallResult;
}

export function createSignInActions(
  authClient: SignInClient,
  defaults: CreateSignInActionsOptions = {},
): SignInActions {
  const defaultCallbackURL = defaults.callbackURL ?? DEFAULT_SIGN_IN_CALLBACK_URL;

  return {
    email(options) {
      return signInWithEmailPassword(authClient, options);
    },
    feishu(options = {}) {
      return signInWithFeishu(authClient, {
        callbackURL: options.callbackURL ?? defaultCallbackURL,
        errorCallbackURL: options.errorCallbackURL ?? defaults.errorCallbackURL,
        providerId: options.providerId ?? defaults.feishuProviderId,
      });
    },
    google(options = {}) {
      return signInWithGoogle(authClient, {
        baseURL: options.baseURL ?? defaults.baseURL,
        callbackURL: options.callbackURL ?? defaultCallbackURL,
        errorCallbackURL: options.errorCallbackURL ?? defaults.errorCallbackURL,
        provider: options.provider,
      });
    },
  };
}
