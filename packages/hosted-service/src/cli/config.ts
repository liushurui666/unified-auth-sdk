import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { resolveUnifiedAuthConfigValue } from "../config.js";
import type { AuthProvider, UnifiedAuthConfig } from "../config.js";

export type CheckStatus = "fail" | "pass" | "warn";

export interface InitUnifiedAuthConfigOptions {
  configPath?: string;
  cwd?: string;
}

export interface InitUnifiedAuthConfigResult {
  created: boolean;
  path: string;
}

export interface DoctorCheck {
  message: string;
  status: CheckStatus;
}

export interface DoctorUnifiedAuthConfigResult {
  checks: DoctorCheck[];
  ok: boolean;
}

const defaultConfigFileName = "unified-auth.config.ts";
const allowedProviders = new Set<AuthProvider>(["feishu", "github", "google"]);

export function initUnifiedAuthConfig(options: InitUnifiedAuthConfigOptions = {}): InitUnifiedAuthConfigResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const path = resolve(cwd, options.configPath ?? defaultConfigFileName);

  if (existsSync(path)) {
    return { created: false, path };
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, createDefaultConfigSource(cwd));

  return { created: true, path };
}

export function doctorUnifiedAuthConfig(
  config: UnifiedAuthConfig | undefined,
  path: string | undefined,
): DoctorUnifiedAuthConfigResult {
  const checks: DoctorCheck[] = [];

  if (path) {
    checks.push(pass(`${basename(path)} exists`));
  } else {
    checks.push(fail(`${defaultConfigFileName} is missing; run unified-auth init`));
  }
  if (!config) {
    return { checks, ok: false };
  }

  checkApp(checks, config);
  checkAuth(checks, config);
  checkDatabase(checks, config);
  checkRealm(checks, config);
  checkProviders(checks, config.providers);

  return {
    checks,
    ok: !checks.some((check) => check.status === "fail"),
  };
}

function createDefaultConfigSource(cwd: string) {
  const appId = inferClientId(cwd);
  const appName = titleFromClientId(appId);

  return `import { defineUnifiedAuthConfig } from "@rc-tool/unified-auth-hosted-service/config";

export default defineUnifiedAuthConfig({
  app: {
    id: "${appId}",
    name: "${appName}",
    origin: "http://localhost:3004",
    redirectURI: "http://localhost:3004/",
  },
  auth: {
    origin: "http://localhost:3004",
    secret: () => process.env.BETTER_AUTH_SECRET,
  },
  database: {
    url: () => process.env.DATABASE_URL,
  },
  providers: ["feishu", "google", "github"],
  realm: "${normalizeRealmId(appId)}",
});
`;
}

function checkApp(checks: DoctorCheck[], config: UnifiedAuthConfig) {
  if (config.app?.id) {
    checks.push(pass("app.id is set"));
  } else {
    checks.push(fail("app.id is missing"));
  }
  if (config.app?.name) {
    checks.push(pass("app.name is set"));
  } else {
    checks.push(warn("app.name is missing; app.id will be used as display name"));
  }

  const origin = config.app?.origin ?? getURLOrigin(config.app?.url);
  const redirectURI = config.app?.redirectURI ?? config.app?.url;

  checkURL(checks, origin, "app.origin");
  checkURL(checks, redirectURI, "app.redirectURI");
}

function checkAuth(checks: DoctorCheck[], config: UnifiedAuthConfig) {
  const authOrigin = config.auth?.origin ?? config.auth?.url ?? config.app?.origin ?? getURLOrigin(config.app?.url);

  checkURL(checks, authOrigin, "auth.origin");

  if (resolveUnifiedAuthConfigValue(config.auth?.secret)) {
    checks.push(pass("auth.secret is provided by config"));
  } else {
    checks.push(warn("auth.secret is not set in config; runtime must provide a Better Auth secret"));
  }
}

function checkDatabase(checks: DoctorCheck[], config: UnifiedAuthConfig) {
  if (resolveUnifiedAuthConfigValue(config.database?.url)) {
    checks.push(pass("database.url is provided by config"));
  } else {
    checks.push(fail("database.url is missing; db migrate and doctor database checks need a PostgreSQL URL"));
  }
}

function checkRealm(checks: DoctorCheck[], config: UnifiedAuthConfig) {
  const realm = config.realm ?? config.app?.id;

  if (!realm) {
    checks.push(fail("realm is missing and app.id cannot be used as fallback"));
    return;
  }

  checks.push(pass(`realm maps to PostgreSQL schema auth_${normalizeRealmId(realm).replace(/^auth_/, "")}`));
}

function checkProviders(checks: DoctorCheck[], providers: AuthProvider[] | undefined) {
  if (!providers?.length) {
    checks.push(warn("providers is empty; login page will show all built-in providers unless overridden"));
    return;
  }

  for (const provider of providers) {
    if (allowedProviders.has(provider)) {
      checks.push(pass(`${provider} provider is configured`));
    } else {
      checks.push(fail(`unsupported provider: ${provider}`));
    }
  }
}

function checkURL(checks: DoctorCheck[], value: string | undefined, label: string) {
  if (!value) {
    checks.push(fail(`${label} is missing`));
    return;
  }

  try {
    new URL(value);
    checks.push(pass(`${label} is a valid URL`));
  } catch {
    checks.push(fail(`${label} is not a valid URL`));
  }
}

function pass(message: string): DoctorCheck {
  return { message, status: "pass" };
}

function warn(message: string): DoctorCheck {
  return { message, status: "warn" };
}

function fail(message: string): DoctorCheck {
  return { message, status: "fail" };
}

function inferClientId(cwd: string) {
  const id = basename(cwd)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id || "app";
}

function normalizeRealmId(realmId: string) {
  return realmId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_") || "default";
}

function titleFromClientId(clientId: string) {
  return clientId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Application";
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
