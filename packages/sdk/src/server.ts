import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth } from "better-auth/plugins";
import { buildFeishuOAuthProvider } from "./providers/feishu";
import type { FeishuOAuthProviderOptions } from "./providers/feishu";

type BetterAuthOptions = Parameters<typeof betterAuth>[0];
type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0];
type DrizzleConfig = Parameters<typeof drizzleAdapter>[1];

export interface AuthServiceEnv {
  BETTER_AUTH_URL?: string;
  FEISHU_APP_ID?: string;
  FEISHU_APP_SECRET?: string;
  FEISHU_APP_ID2?: string;
  FEISHU_APP_SECRET2?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NODE_ENV?: string;
}

export interface GoogleProviderOptions {
  clientId: string;
  clientSecret: string;
}

export interface CreateAuthServerOptions {
  advanced?: BetterAuthOptions["advanced"];
  appName?: string;
  baseURL?: string;
  database: DrizzleDatabase;
  databaseHooks?: BetterAuthOptions["databaseHooks"];
  emailAndPassword?: BetterAuthOptions["emailAndPassword"];
  env?: AuthServiceEnv;
  feishuProviders?: FeishuOAuthProviderOptions[];
  googleProvider?: GoogleProviderOptions;
  onAPIError?: BetterAuthOptions["onAPIError"];
  schema: NonNullable<DrizzleConfig["schema"]>;
  session?: BetterAuthOptions["session"];
  trustedOrigins?: string[];
}

export type AuthServer = ReturnType<typeof betterAuth>;

function getRuntimeEnv(): AuthServiceEnv {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: AuthServiceEnv };
  };
  return runtime.process?.env ?? {};
}

function getDefaultAdvanced(env: AuthServiceEnv): BetterAuthOptions["advanced"] {
  if (env.NODE_ENV !== "production") {
    return undefined;
  }
  return {
    trustedProxyHeaders: true,
    useSecureCookies: true,
  };
}

function getDefaultTrustedOrigins(baseURL: string): string[] {
  return [...new Set([baseURL, "http://localhost:3000"])];
}

export function getDefaultFeishuProviders(env: AuthServiceEnv): FeishuOAuthProviderOptions[] {
  return [
    {
      appId: env.FEISHU_APP_ID ?? "",
      appSecret: env.FEISHU_APP_SECRET ?? "",
      providerId: "feishu",
    },
    {
      appId: env.FEISHU_APP_ID2 ?? "",
      appSecret: env.FEISHU_APP_SECRET2 ?? "",
      providerId: "feishu-secondary",
    },
  ];
}

export function createAuthServer(options: CreateAuthServerOptions): AuthServer {
  const env = options.env ?? getRuntimeEnv();
  const baseURL = options.baseURL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const feishuProviders = options.feishuProviders ?? getDefaultFeishuProviders(env);
  const googleProvider = options.googleProvider ?? {
    clientId: env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
  };

  return betterAuth({
    advanced: options.advanced ?? getDefaultAdvanced(env),
    appName: options.appName ?? "Auth Service",
    baseURL,
    database: drizzleAdapter(options.database, {
      provider: "pg",
      schema: options.schema,
    }),
    databaseHooks: options.databaseHooks,
    emailAndPassword: options.emailAndPassword ?? {
      autoSignIn: true,
      disableSignUp: true,
      enabled: true,
      minPasswordLength: 8,
    },
    onAPIError: options.onAPIError ?? {
      errorURL: "/login",
    },
    plugins: [
      admin({
        bannedUserMessage: "你的账号已被封禁，请联系管理员。",
      }),
      genericOAuth({
        config: feishuProviders.map(buildFeishuOAuthProvider),
      }),
    ],
    session: options.session ?? {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 5,
    },
    socialProviders: {
      google: googleProvider,
    },
    trustedOrigins: options.trustedOrigins ?? getDefaultTrustedOrigins(baseURL),
    user: {
      additionalFields: {
        feishuTenantKey: {
          input: false,
          required: false,
          type: "string",
        },
        feishuTenantName: {
          input: false,
          required: false,
          type: "string",
        },
      },
    },
  }) as unknown as AuthServer;
}
