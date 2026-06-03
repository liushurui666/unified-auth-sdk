import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export type AuthProvider = "feishu" | "github" | "google";
export type AuthStoreProvider = "file" | "prisma";
export type CheckStatus = "fail" | "pass" | "warn";

export interface InitAuthEnvOptions {
  app?: string;
  cwd?: string;
  envFile?: string;
  exampleFile?: string;
  name?: string;
  port?: number;
  providers?: AuthProvider[];
  redirectURI?: string;
  serviceURL?: string;
  store?: AuthStoreProvider;
}

export interface DoctorAuthEnvOptions {
  cwd?: string;
  envFile?: string;
}

export interface EnvWriteSummary {
  added: string[];
  path: string;
  updated: string[];
}

export interface InitAuthEnvResult {
  env: EnvWriteSummary;
  example: EnvWriteSummary;
  gitignore: EnvWriteSummary;
}

export interface DoctorCheck {
  message: string;
  status: CheckStatus;
}

export interface DoctorAuthEnvResult {
  checks: DoctorCheck[];
  ok: boolean;
}

interface EnvEntry {
  key: string;
  sensitive?: boolean;
  value: string;
}

interface ParsedAssignment {
  index: number;
  value: string;
}

const defaultProviders: AuthProvider[] = ["feishu", "google", "github"];
const envSectionHeader = "# Unified Auth Service";

// init 只追加缺失配置，不覆盖业务项目已有环境变量，方便反复执行和升级 SDK。
export function initAuthEnv(options: InitAuthEnvOptions = {}): InitAuthEnvResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const envPath = resolve(cwd, options.envFile ?? ".env.local");
  const examplePath = resolve(cwd, options.exampleFile ?? ".env.example");
  const gitignorePath = resolve(cwd, ".gitignore");
  const config = resolveInitConfig(cwd, options);

  return {
    env: writeEnvFile(envPath, buildRuntimeEntries(config)),
    example: writeEnvFile(examplePath, buildExampleEntries(config)),
    gitignore: ensureGitignore(gitignorePath),
  };
}

export function doctorAuthEnv(options: DoctorAuthEnvOptions = {}): DoctorAuthEnvResult {
  const cwd = resolve(options.cwd ?? process.cwd());
  const envPath = resolve(cwd, options.envFile ?? ".env.local");
  const env = readMergedEnv(cwd, envPath);
  const checks: DoctorCheck[] = [];

  if (existsSync(envPath)) {
    checks.push(pass(`${relativePath(cwd, envPath)} exists`));
  } else {
    checks.push(fail(`${relativePath(cwd, envPath)} is missing; run unified-auth init`));
  }

  requireValue(checks, env, "AUTH_SERVICE_URL");
  requireValue(checks, env, "AUTH_CLIENT_ID");
  requireValue(checks, env, "AUTH_ALLOWED_REDIRECT_URI");
  checkURL(checks, env, "AUTH_SERVICE_URL");
  checkURL(checks, env, "AUTH_ALLOWED_REDIRECT_URI");
  checkSessionSecret(checks, env.AUTH_SESSION_SECRET);
  checkStore(checks, env);
  checkProvider(checks, env, "feishu", "FEISHU_APP_ID", "FEISHU_APP_SECRET", "FEISHU_REDIRECT_URI");
  checkProvider(checks, env, "google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI");
  checkProvider(checks, env, "github", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_REDIRECT_URI");
  checkGitignore(checks, cwd);

  return {
    checks,
    ok: !checks.some((check) => check.status === "fail"),
  };
}

function resolveInitConfig(cwd: string, options: InitAuthEnvOptions) {
  const redirectURI = options.redirectURI ?? "http://localhost:3004/";
  const serviceURL = trimTrailingSlash(options.serviceURL ?? getURLOrigin(redirectURI) ?? `http://localhost:${options.port ?? 3005}`);
  const port = options.port ?? getURLPort(serviceURL) ?? 3005;
  const clientId = options.app ?? inferClientId(cwd);

  return {
    clientId,
    name: options.name ?? titleFromClientId(clientId),
    port,
    providers: options.providers ?? defaultProviders,
    redirectURI,
    serviceURL,
    store: options.store ?? "file",
  };
}

function buildRuntimeEntries(config: ReturnType<typeof resolveInitConfig>): EnvEntry[] {
  return [
    { key: "AUTH_SERVICE_PORT", value: String(config.port) },
    { key: "AUTH_SERVICE_URL", value: config.serviceURL },
    { key: "AUTH_CLIENT_ID", value: config.clientId },
    { key: "AUTH_CLIENT_NAME", value: config.name },
    { key: "AUTH_LOGIN_BACKGROUND_URL", value: "" },
    { key: "AUTH_ALLOWED_REDIRECT_URI", value: config.redirectURI },
    { key: "AUTH_SESSION_SECRET", sensitive: true, value: randomBytes(32).toString("base64url") },
    { key: "AUTH_ALLOW_DEV_LOGIN", value: "true" },
    { key: "AUTH_STORE_PROVIDER", value: config.store },
    ...buildStoreEntries(config.store, false),
    ...buildProviderEntries(config.serviceURL, config.providers, false),
  ];
}

function buildExampleEntries(config: ReturnType<typeof resolveInitConfig>): EnvEntry[] {
  return [
    { key: "AUTH_SERVICE_PORT", value: String(config.port) },
    { key: "AUTH_SERVICE_URL", value: config.serviceURL },
    { key: "AUTH_CLIENT_ID", value: config.clientId },
    { key: "AUTH_CLIENT_NAME", value: config.name },
    { key: "AUTH_LOGIN_BACKGROUND_URL", value: "" },
    { key: "AUTH_ALLOWED_REDIRECT_URI", value: config.redirectURI },
    { key: "AUTH_SESSION_SECRET", sensitive: true, value: "please-change-this-to-a-long-random-string" },
    { key: "AUTH_ALLOW_DEV_LOGIN", value: "true" },
    { key: "AUTH_STORE_PROVIDER", value: config.store },
    ...buildStoreEntries(config.store, true),
    ...buildProviderEntries(config.serviceURL, config.providers, true),
  ];
}

function buildStoreEntries(store: AuthStoreProvider, example: boolean): EnvEntry[] {
  // 默认 file store 是为了让业务方先跑通登录；生产持久化再切到 prisma。
  if (store === "prisma") {
    return [
      {
        key: "AUTH_DATABASE_URL",
        sensitive: true,
        value: example ? "postgresql://user:password@localhost:5432/unified_auth?schema=public" : "",
      },
    ];
  }

  return [{ key: "AUTH_STORE_FILE", value: ".auth/unified-auth-store.json" }];
}

function buildProviderEntries(serviceURL: string, providers: AuthProvider[], example: boolean): EnvEntry[] {
  const callbackBase = trimTrailingSlash(serviceURL);
  const entries: EnvEntry[] = [];

  if (providers.includes("feishu")) {
    entries.push(
      { key: "FEISHU_APP_ID", value: "" },
      { key: "FEISHU_APP_SECRET", sensitive: true, value: "" },
      { key: "FEISHU_REDIRECT_URI", value: `${callbackBase}/api/auth/feishu/callback` },
    );
  }
  if (providers.includes("google")) {
    entries.push(
      { key: "GOOGLE_CLIENT_ID", value: "" },
      { key: "GOOGLE_CLIENT_SECRET", sensitive: true, value: "" },
      { key: "GOOGLE_REDIRECT_URI", value: `${callbackBase}/api/auth/google/callback` },
    );
  }
  if (providers.includes("github")) {
    entries.push(
      { key: "GITHUB_CLIENT_ID", value: "" },
      { key: "GITHUB_CLIENT_SECRET", sensitive: true, value: "" },
      { key: "GITHUB_REDIRECT_URI", value: `${callbackBase}/api/auth/github/callback` },
    );
  }

  if (example) {
    return entries.map((entry) => entry.sensitive ? { ...entry, value: entry.value || "" } : entry);
  }

  return entries;
}

function writeEnvFile(path: string, entries: EnvEntry[]): EnvWriteSummary {
  const lines = readLines(path);
  const assignments = parseAssignments(lines);
  const added: string[] = [];
  const updated: string[] = [];
  const pending: string[] = [];

  for (const entry of entries) {
    const existing = assignments.get(entry.key);

    if (!existing) {
      pending.push(formatEntry(entry));
      added.push(entry.key);
      continue;
    }
    if (!entry.sensitive && !existing.value && entry.value) {
      lines[existing.index] = formatEntry(entry);
      updated.push(entry.key);
    }
    if (entry.key === "AUTH_SESSION_SECRET" && isPlaceholderSecret(existing.value) && entry.value) {
      lines[existing.index] = formatEntry(entry);
      updated.push(entry.key);
    }
  }

  if (pending.length) {
    if (lines.length && lines[lines.length - 1] !== "") {
      lines.push("");
    }
    if (!lines.includes(envSectionHeader)) {
      lines.push(envSectionHeader);
    }
    lines.push(...pending);
  }

  if (added.length || updated.length || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${lines.join("\n").replace(/\n*$/, "")}\n`);
  }

  return { added, path, updated };
}

function ensureGitignore(path: string): EnvWriteSummary {
  const lines = readLines(path);
  const required = [".auth", ".env", ".env.*", "!.env.example"];
  const added = required.filter((item) => !lines.includes(item));

  if (added.length) {
    if (lines.length && lines[lines.length - 1] !== "") {
      lines.push("");
    }
    lines.push(...added);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${lines.join("\n").replace(/\n*$/, "")}\n`);
  } else if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
  }

  return { added, path, updated: [] };
}

function readMergedEnv(cwd: string, envPath: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const path of [envPath, join(cwd, ".env")]) {
    for (const [key, assignment] of parseAssignments(readLines(path))) {
      if (!(key in env)) {
        env[key] = assignment.value;
      }
    }
  }

  return env;
}

function readLines(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n").filter((line, index, list) => {
    return index < list.length - 1 || line.length > 0;
  });
}

function parseAssignments(lines: string[]): Map<string, ParsedAssignment> {
  const assignments = new Map<string, ParsedAssignment>();

  lines.forEach((line, index) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);

    if (match) {
      assignments.set(match[1], {
        index,
        value: unquoteEnvValue(match[2]),
      });
    }
  });

  return assignments;
}

function formatEntry(entry: EnvEntry) {
  return `${entry.key}=${entry.value}`;
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function requireValue(checks: DoctorCheck[], env: Record<string, string>, key: string) {
  if (env[key]) {
    checks.push(pass(`${key} is set`));
  } else {
    checks.push(fail(`${key} is missing`));
  }
}

function checkURL(checks: DoctorCheck[], env: Record<string, string>, key: string) {
  if (!env[key]) {
    return;
  }
  try {
    new URL(env[key]);
    checks.push(pass(`${key} is a valid URL`));
  } catch {
    checks.push(fail(`${key} is not a valid URL`));
  }
}

function checkSessionSecret(checks: DoctorCheck[], secret: string | undefined) {
  // session secret 是 cookie 签名密钥，必须由业务环境持有，不能写死进 npm 包。
  if (!secret) {
    checks.push(fail("AUTH_SESSION_SECRET is missing"));
    return;
  }
  if (isPlaceholderSecret(secret) || secret.length < 32) {
    checks.push(fail("AUTH_SESSION_SECRET must be replaced with a long random value"));
    return;
  }

  checks.push(pass("AUTH_SESSION_SECRET looks usable"));
}

function checkStore(checks: DoctorCheck[], env: Record<string, string>) {
  const store = env.AUTH_STORE_PROVIDER || "file";

  if (store === "prisma") {
    if (env.AUTH_DATABASE_URL || env.DATABASE_URL) {
      checks.push(pass("Prisma store has a database URL"));
    } else {
      checks.push(fail("AUTH_STORE_PROVIDER=prisma requires AUTH_DATABASE_URL"));
    }
    return;
  }
  if (store === "file") {
    checks.push(env.AUTH_STORE_FILE ? pass("File store path is set") : warn("AUTH_STORE_FILE is missing; the service will use its default path"));
    return;
  }

  checks.push(fail(`Unsupported AUTH_STORE_PROVIDER: ${store}`));
}

function checkProvider(
  checks: DoctorCheck[],
  env: Record<string, string>,
  provider: string,
  idKey: string,
  secretKey: string,
  redirectKey: string,
) {
  const hasId = Boolean(env[idKey]);
  const hasSecret = Boolean(env[secretKey]);

  if (!hasId && !hasSecret) {
    checks.push(warn(`${provider} provider is disabled`));
    return;
  }
  if (!hasId || !hasSecret) {
    checks.push(fail(`${provider} provider needs both ${idKey} and ${secretKey}`));
    return;
  }

  checks.push(pass(`${provider} provider credentials are set`));
  if (env[redirectKey]) {
    checkURL(checks, env, redirectKey);
  } else {
    checks.push(warn(`${redirectKey} is missing; the service will use its default callback URL`));
  }
}

function checkGitignore(checks: DoctorCheck[], cwd: string) {
  const path = join(cwd, ".gitignore");
  const lines = readLines(path);

  if (lines.includes(".env.*") && lines.includes("!.env.example")) {
    checks.push(pass(".gitignore keeps local env files private"));
  } else {
    checks.push(warn(".gitignore should include .env.* and !.env.example"));
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

function isPlaceholderSecret(value: string) {
  return value === "please-change-this-to-a-long-random-string" || value === "unified-auth-local-secret";
}

function inferClientId(cwd: string) {
  const id = basename(cwd)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id || "app";
}

function titleFromClientId(clientId: string) {
  return clientId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ") || "Application";
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getURLOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function getURLPort(value: string) {
  try {
    const url = new URL(value);

    if (url.port) {
      return Number(url.port);
    }
    if (url.protocol === "https:") {
      return 443;
    }
    if (url.protocol === "http:") {
      return 80;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function relativePath(cwd: string, path: string) {
  return path.startsWith(cwd) ? path.slice(cwd.length + 1) : path;
}
