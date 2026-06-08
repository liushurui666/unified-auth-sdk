export type AuthProvider = "feishu" | "github" | "google";
export type UnifiedAuthConfigValue<T> = T | (() => T | undefined);

export interface UnifiedAuthAppConfig {
  id?: string;
  name?: string;
  origin?: string;
  redirectURI?: string;
  url?: string;
}

export interface UnifiedAuthServiceConfig {
  origin?: string;
  port?: number;
  secret?: UnifiedAuthConfigValue<string>;
  trustedOrigins?: string[];
  url?: string;
}

export interface UnifiedAuthDatabaseConfig {
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
  };
  url?: UnifiedAuthConfigValue<string>;
}

export interface UnifiedAuthConfig {
  app?: UnifiedAuthAppConfig;
  auth?: UnifiedAuthServiceConfig;
  database?: UnifiedAuthDatabaseConfig;
  providers?: AuthProvider[];
  realm?: string;
}

export function defineUnifiedAuthConfig(config: UnifiedAuthConfig): UnifiedAuthConfig {
  return config;
}

export function resolveUnifiedAuthConfigValue<T>(value: UnifiedAuthConfigValue<T> | undefined): T | undefined {
  return typeof value === "function" ? (value as () => T | undefined)() : value;
}
