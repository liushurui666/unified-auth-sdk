import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { doctorAuthEnv, initAuthEnv } from "./cli/env.js";

function createTempProject() {
  return mkdtempSync(join(tmpdir(), "unified-auth-"));
}

function readProjectFile(cwd: string, path: string) {
  return readFileSync(join(cwd, path), "utf8");
}

describe("auth env CLI helpers", () => {
  it("initializes local env files without real secrets in the example file", () => {
    const cwd = createTempProject();

    const result = initAuthEnv({
      app: "ai-pm",
      cwd,
      name: "AI PM",
      providers: ["feishu"],
      redirectURI: "http://localhost:3004/",
    });

    const env = readProjectFile(cwd, ".env.local");
    const example = readProjectFile(cwd, ".env.example");
    const gitignore = readProjectFile(cwd, ".gitignore");

    expect(result.env.added).toContain("AUTH_SESSION_SECRET");
    expect(env).toContain("AUTH_CLIENT_ID=ai-pm");
    expect(env).toContain("AUTH_LOGIN_BACKGROUND_URL=");
    expect(env).toContain("AUTH_SERVICE_PORT=3004");
    expect(env).toContain("AUTH_STORE_PROVIDER=file");
    expect(env).toContain("AUTH_STORE_FILE=.auth/unified-auth-store.json");
    expect(env).toContain("AUTH_SERVICE_URL=http://localhost:3004");
    expect(env).toContain("FEISHU_REDIRECT_URI=http://localhost:3004/api/auth/feishu/callback");
    expect(env).not.toContain("GOOGLE_CLIENT_ID=");
    expect(env).toMatch(/AUTH_SESSION_SECRET=(?!please-change-this-to-a-long-random-string).{32,}/);
    expect(example).toContain("AUTH_SESSION_SECRET=please-change-this-to-a-long-random-string");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("!.env.example");
  });

  it("does not overwrite existing non-empty values", () => {
    const cwd = createTempProject();
    const secret = "existing-existing-existing-existing-secret";

    writeFileSync(join(cwd, ".env.local"), `AUTH_CLIENT_ID=custom-app\nAUTH_SESSION_SECRET=${secret}\n`);

    initAuthEnv({
      app: "ai-pm",
      cwd,
    });

    const env = readProjectFile(cwd, ".env.local");

    expect(env).toContain("AUTH_CLIENT_ID=custom-app");
    expect(env).toContain(`AUTH_SESSION_SECRET=${secret}`);
  });

  it("reports initialized file-store config as usable", () => {
    const cwd = createTempProject();

    initAuthEnv({ cwd });

    const result = doctorAuthEnv({ cwd });

    expect(result.ok).toBe(true);
    expect(result.checks.some((check) => check.status === "warn")).toBe(true);
  });

  it("fails doctor checks when prisma store has no database URL", () => {
    const cwd = createTempProject();

    writeFileSync(join(cwd, ".env.local"), [
      "AUTH_SERVICE_URL=http://localhost:3005",
      "AUTH_CLIENT_ID=ai-pm",
      "AUTH_ALLOWED_REDIRECT_URI=http://localhost:3004/",
      "AUTH_SESSION_SECRET=existing-existing-existing-existing-secret",
      "AUTH_STORE_PROVIDER=prisma",
      "",
    ].join("\n"));

    const result = doctorAuthEnv({ cwd });

    expect(result.ok).toBe(false);
    expect(result.checks).toContainEqual({
      message: "AUTH_STORE_PROVIDER=prisma requires AUTH_DATABASE_URL",
      status: "fail",
    });
  });
});
