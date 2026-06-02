import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv();

const PLACEHOLDER_DATABASE_URL =
  "postgresql://unified_auth:unified_auth@localhost:5432/unified_auth?schema=public";
const command = process.argv.join(" ");
const canUsePlaceholderUrl = /\b(generate|format|validate|version|migrate diff)\b/.test(command);
const databaseUrl =
  process.env.AUTH_DATABASE_URL ??
  process.env.DATABASE_URL ??
  (canUsePlaceholderUrl
    ? PLACEHOLDER_DATABASE_URL
    : (() => {
        throw new Error("缺少 AUTH_DATABASE_URL 或 DATABASE_URL，Prisma Auth Store 需要 PostgreSQL 数据库连接。");
      })());

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
