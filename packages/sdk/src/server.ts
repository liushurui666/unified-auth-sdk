import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, genericOAuth } from "better-auth/plugins";
import { buildFeishuOAuthProvider } from "./providers/feishu.js";
import { createAuthDrizzleSchema } from "./schema.js";
import type { FeishuOAuthProviderOptions } from "./providers/feishu.js";

type BetterAuthOptions = Parameters<typeof betterAuth>[0];
type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0];
type DrizzleConfig = Parameters<typeof drizzleAdapter>[1];
type AuthServerConfigValue<T> = T | (() => T | undefined);

export interface AuthServiceEnv {
  AUTH_REALM_ID?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  FEISHU_APP_ID?: string;
  FEISHU_APP_SECRET?: string;
  FEISHU_APP_ID2?: string;
  FEISHU_APP_SECRET2?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  NODE_ENV?: string;
}

export interface AuthServerConfig {
  app?: {
    id?: string;
    name?: string;
    origin?: string;
    redirectURI?: string;
    url?: string;
  };
  auth?: {
    origin?: string;
    secret?: AuthServerConfigValue<string>;
    trustedOrigins?: string[];
    url?: string;
  };
  realm?: string;
}

export interface GitHubProviderOptions {
  clientId: string;
  clientSecret: string;
}

export interface GoogleProviderOptions {
  clientId: string;
  clientSecret: string;
}

export interface CreateAuthServerOptions {
  advanced?: BetterAuthOptions["advanced"];
  appName?: string;
  baseURL?: string;
  config?: AuthServerConfig;
  database: DrizzleDatabase;
  databaseHooks?: BetterAuthOptions["databaseHooks"];
  emailAndPassword?: BetterAuthOptions["emailAndPassword"];
  env?: AuthServiceEnv;
  feishuProviders?: FeishuOAuthProviderOptions[];
  githubProvider?: GitHubProviderOptions;
  googleProvider?: GoogleProviderOptions;
  onAPIError?: BetterAuthOptions["onAPIError"];
  realmId?: string;
  schema?: NonNullable<DrizzleConfig["schema"]>;
  secret?: BetterAuthOptions["secret"];
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
  const baseURL = options.baseURL
    ?? options.config?.auth?.origin
    ?? options.config?.auth?.url
    ?? options.config?.app?.origin
    ?? getURLOrigin(options.config?.app?.url)
    ?? env.BETTER_AUTH_URL
    ?? "http://localhost:3000";
  const feishuProviders = options.feishuProviders ?? getDefaultFeishuProviders(env);
  const googleProvider = options.googleProvider ?? {
    clientId: env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
  };
  const githubProvider = options.githubProvider ?? {
    clientId: env.GITHUB_CLIENT_ID ?? "",
    clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
  };
  const schema = options.schema ?? createAuthDrizzleSchema(options.realmId ?? options.config?.realm ?? env.AUTH_REALM_ID);
  const enabledFeishuProviders = feishuProviders.filter(hasOAuthCredentials);

  return betterAuth({
    advanced: options.advanced ?? getDefaultAdvanced(env),
    appName: options.appName ?? options.config?.app?.name ?? "Auth Service",
    baseURL,
    database: drizzleAdapter(options.database, {
      camelCase: true,
      provider: "pg",
      schema,
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
      ...(enabledFeishuProviders.length
        ? [
            genericOAuth({
              config: enabledFeishuProviders.map(buildFeishuOAuthProvider),
            }),
          ]
        : []),
    ],
    secret: options.secret ?? resolveConfigValue(options.config?.auth?.secret) ?? env.BETTER_AUTH_SECRET,
    session: options.session ?? {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 5,
    },
    socialProviders: createSocialProviders({ githubProvider, googleProvider }),
    trustedOrigins: options.trustedOrigins ?? options.config?.auth?.trustedOrigins ?? getDefaultTrustedOrigins(baseURL),
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

function resolveConfigValue<T>(value: AuthServerConfigValue<T> | undefined): T | undefined {
  return typeof value === "function" ? (value as () => T | undefined)() : value;
}

function getURLOrigin(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function hasOAuthCredentials(provider: Pick<FeishuOAuthProviderOptions, "appId" | "appSecret">) {
  return Boolean(provider.appId && provider.appSecret);
}

function createSocialProviders(options: {
  githubProvider: GitHubProviderOptions;
  googleProvider: GoogleProviderOptions;
}): NonNullable<BetterAuthOptions["socialProviders"]> {
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};

  if (options.githubProvider.clientId && options.githubProvider.clientSecret) {
    socialProviders.github = options.githubProvider;
  }
  if (options.googleProvider.clientId && options.googleProvider.clientSecret) {
    socialProviders.google = options.googleProvider;
  }

  return socialProviders;
}
