import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUnifiedAuthConfigValue } from "./config.js";
import { doctorUnifiedAuthConfig } from "./cli/config.js";
import { buildAuthDatabasePlan } from "./cli/database.js";
import { loadUnifiedAuthConfig } from "./cli/config-file.js";
import { runCli } from "./cli/index.js";

function createTempProject() {
  return mkdtempSync(join(tmpdir(), "unified-auth-"));
}

function readProjectFile(cwd: string, path: string) {
  return readFileSync(join(cwd, path), "utf8");
}

function createOutput() {
  const logs: string[] = [];

  return {
    output: {
      error(message: string) {
        logs.push(message);
      },
      log(message: string) {
        logs.push(message);
      },
    },
    logs,
  };
}

describe("auth config CLI helpers", () => {
  it("creates unified-auth.config.ts without generating env files", async () => {
    const cwd = createTempProject();
    const { logs, output } = createOutput();

    await expect(runCli(["init", "--cwd", cwd], output)).resolves.toBe(0);

    const config = readProjectFile(cwd, "unified-auth.config.ts");

    expect(config).toContain("defineUnifiedAuthConfig");
    expect(config).toContain("origin: \"http://localhost:3004\"");
    expect(config).toContain("redirectURI: \"http://localhost:3004/\"");
    expect(existsSync(join(cwd, ".env.local"))).toBe(false);
    expect(existsSync(join(cwd, ".env.example"))).toBe(false);
    expect(logs).toContain("Unified Auth config created.");
  });

  it("loads unified-auth.config.ts for init and doctor without CLI parameters", async () => {
    const cwd = createTempProject();
    const { output } = createOutput();

    writeFileSync(join(cwd, "unified-auth.config.ts"), `
      export default {
        app: {
          id: "ai-pm",
          name: "AI PM",
          origin: "http://localhost:3004",
          redirectURI: "http://localhost:3004/"
        },
        providers: ["github"],
        database: {
          url: "postgresql://user:pass@localhost:5432/auth"
        },
        realm: "shared"
      } satisfies import("@rc-tool/unified-auth-hosted-service/config").UnifiedAuthConfig;
    `);

    await expect(runCli(["init", "--cwd", cwd], output)).resolves.toBe(0);

    const loaded = await loadUnifiedAuthConfig(cwd);
    const result = doctorUnifiedAuthConfig(loaded.config, loaded.path);

    expect(result.ok).toBe(true);
    expect(result.checks).toContainEqual({
      message: "app.id is set",
      status: "pass",
    });
    expect(result.checks).toContainEqual({
      message: "github provider is configured",
      status: "pass",
    });
    expect(existsSync(join(cwd, ".env.local"))).toBe(false);
  });

  it("loads project env files before evaluating unified-auth.config.ts", async () => {
    const cwd = createTempProject();
    const previousDatabaseURL = process.env.UNIFIED_AUTH_TEST_DATABASE_URL;
    const previousSecret = process.env.UNIFIED_AUTH_TEST_SECRET;

    delete process.env.UNIFIED_AUTH_TEST_DATABASE_URL;
    process.env.UNIFIED_AUTH_TEST_SECRET = "shell-secret";

    try {
      writeFileSync(join(cwd, ".env"), `
        UNIFIED_AUTH_TEST_DATABASE_URL=postgresql://env-file:pass@localhost:5432/env_file
        UNIFIED_AUTH_TEST_SECRET=env-file-secret
      `);
      writeFileSync(join(cwd, ".env.local"), `
        UNIFIED_AUTH_TEST_DATABASE_URL=postgresql://env-local:pass@localhost:5432/env_local
      `);
      writeFileSync(join(cwd, "unified-auth.config.ts"), `
        export default {
          app: {
            id: "ai-pm",
            name: "AI PM",
            origin: "http://localhost:3004",
            redirectURI: "http://localhost:3004/"
          },
          auth: {
            origin: "http://localhost:3004",
            secret: () => process.env.UNIFIED_AUTH_TEST_SECRET
          },
          database: {
            url: () => process.env.UNIFIED_AUTH_TEST_DATABASE_URL
          },
          providers: ["feishu"],
          realm: "ai-pm"
        } satisfies import("@rc-tool/unified-auth-hosted-service/config").UnifiedAuthConfig;
      `);

      const loaded = await loadUnifiedAuthConfig(cwd);

      expect(resolveUnifiedAuthConfigValue(loaded.config?.database?.url)).toBe("postgresql://env-local:pass@localhost:5432/env_local");
      expect(resolveUnifiedAuthConfigValue(loaded.config?.auth?.secret)).toBe("shell-secret");
    } finally {
      if (previousDatabaseURL === undefined) {
        delete process.env.UNIFIED_AUTH_TEST_DATABASE_URL;
      } else {
        process.env.UNIFIED_AUTH_TEST_DATABASE_URL = previousDatabaseURL;
      }
      if (previousSecret === undefined) {
        delete process.env.UNIFIED_AUTH_TEST_SECRET;
      } else {
        process.env.UNIFIED_AUTH_TEST_SECRET = previousSecret;
      }
    }
  });

  it("fails doctor when the config file is missing", async () => {
    const cwd = createTempProject();
    const loaded = await loadUnifiedAuthConfig(cwd);
    const result = doctorUnifiedAuthConfig(loaded.config, loaded.path);

    expect(result.ok).toBe(false);
    expect(result.checks).toContainEqual({
      message: "unified-auth.config.ts is missing; run unified-auth init",
      status: "fail",
    });
  });

  it("plans missing auth database objects without migration records", () => {
    const plan = buildAuthDatabasePlan("auth_ai_pm", {
      schemaExists: false,
      tables: new Map(),
    });

    expect(plan.warnings).toEqual([]);
    expect(plan.actions.map((action) => action.label)).toContain("create schema auth_ai_pm");
    expect(plan.actions.map((action) => action.label)).toContain("create table auth_ai_pm.user");
    expect(plan.actions.map((action) => action.label)).toContain("create table auth_ai_pm.session");
    expect(plan.actions.map((action) => action.label)).toContain("create index auth_ai_pm.session_token_unique");
    expect(plan.actions.map((action) => action.label)).toContain("add constraint auth_ai_pm.session_userId_user_id_fk");
  });

  it("plans missing columns, indexes, and constraints from inspected tables", () => {
    const plan = buildAuthDatabasePlan("auth_ai_pm", {
      schemaExists: true,
      tables: new Map([
        ["user", {
          columns: new Map([
            ["id", { dataType: "text", isNullable: false }],
          ]),
          constraints: new Set(["user_pkey"]),
          exists: true,
          indexes: new Set(),
        }],
      ]),
    });

    expect(plan.warnings).toEqual([]);
    expect(plan.actions.map((action) => action.label)).toContain("add column auth_ai_pm.user.email");
    expect(plan.actions.map((action) => action.label)).toContain("create index auth_ai_pm.user_email_unique");
  });
});
