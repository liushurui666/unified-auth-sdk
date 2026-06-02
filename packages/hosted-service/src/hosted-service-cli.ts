import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv, parse as parseEnv } from "dotenv";
import { createHostedAuthNodeServer } from "./hosted-service-node.js";
import { createFileAuthStore } from "./index.js";
import type { HostedAuthStore } from "./index.js";

const FEISHU_ENV_KEYS = ["FEISHU_APP_ID", "FEISHU_APP_SECRET", "FEISHU_REDIRECT_URI"] as const;

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });
loadLegacyFeishuEnv();

function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

const port = Number(readEnv("AUTH_SERVICE_PORT", readEnv("PORT", "3005")));
const authBaseURL = readEnv("AUTH_SERVICE_URL", `http://localhost:${port}`);
const clientId = readEnv("AUTH_CLIENT_ID", "ai-pm");
const redirectURI = readEnv("AUTH_ALLOWED_REDIRECT_URI", "http://localhost:3004/");
const sessionSecret = readEnv("AUTH_SESSION_SECRET", readEnv("SESSION_SECRET", readEnv("BETTER_AUTH_SECRET", "unified-auth-local-secret")));
const storeFile = readEnv("AUTH_STORE_FILE", ".auth/unified-auth-store.json");
const authDatabaseUrl = readEnv("AUTH_DATABASE_URL", readEnv("DATABASE_URL"));
const storeProvider = readEnv("AUTH_STORE_PROVIDER", authDatabaseUrl ? "prisma" : "file");

function loadLegacyFeishuEnv() {
  const envFile = resolve(readEnv("AUTH_FEISHU_ENV_FILE", "../ai-pm/.env.local"));

  if (!existsSync(envFile)) {
    return;
  }

  const legacyEnv = parseEnv(readFileSync(envFile));

  for (const key of FEISHU_ENV_KEYS) {
    // 迁移期允许 SDK Auth Service 读取 AI PM 里的飞书 OAuth 配置，但只补缺失值；
    // 这样 Google/GitHub、数据库和未来 SDK 自有配置不会被旧项目环境变量意外覆盖。
    if (!process.env[key] && legacyEnv[key]) {
      process.env[key] = legacyEnv[key];
    }
  }
}

async function createAuthStore() {
  if (storeProvider === "prisma") {
    const { createPrismaAuthStore } = await importPrismaStore();

    return createPrismaAuthStore({ databaseUrl: authDatabaseUrl });
  }
  if (storeProvider === "file") {
    return createFileAuthStore({ filePath: storeFile });
  }

  throw new Error(`Unsupported AUTH_STORE_PROVIDER: ${storeProvider}`);
}

async function importPrismaStore() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<{ createPrismaAuthStore: (options: { databaseUrl?: string }) => HostedAuthStore }>;

  try {
    return await dynamicImport("@rc-tool/unified-auth-prisma-store");
  } catch (error) {
    throw new Error(
      "AUTH_STORE_PROVIDER=prisma requires installing @rc-tool/unified-auth-prisma-store.",
      { cause: error },
    );
  }
}

const server = createHostedAuthNodeServer({
  allowDevLogin: readEnv("AUTH_ALLOW_DEV_LOGIN", "true") !== "false",
  applications: [
    {
      allowedRedirectURIs: [redirectURI],
      clientId,
      name: readEnv("AUTH_CLIENT_NAME", "AI PM"),
      redirectURI,
    },
  ],
  authBaseURL,
  cookieDomain: readEnv("AUTH_COOKIE_DOMAIN") || undefined,
  feishu: {
    appId: readEnv("FEISHU_APP_ID") || undefined,
    appSecret: readEnv("FEISHU_APP_SECRET") || undefined,
    redirectURI: readEnv("FEISHU_REDIRECT_URI") || undefined,
  },
  google: {
    clientId: readEnv("GOOGLE_CLIENT_ID") || undefined,
    clientSecret: readEnv("GOOGLE_CLIENT_SECRET") || undefined,
    redirectURI: readEnv("GOOGLE_REDIRECT_URI") || undefined,
  },
  github: {
    clientId: readEnv("GITHUB_CLIENT_ID") || undefined,
    clientSecret: readEnv("GITHUB_CLIENT_SECRET") || undefined,
    redirectURI: readEnv("GITHUB_REDIRECT_URI") || undefined,
  },
  sessionSecret,
  store: await createAuthStore(),
});

server.listen(port, () => {
  console.log(`Unified Auth Service listening on ${authBaseURL}`);
  console.log(`Configured client ${clientId} -> ${redirectURI}`);
  console.log(`Auth store: ${storeProvider}`);
});
