import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import type { UnifiedAuthConfig } from "../config.js";

export interface LoadedUnifiedAuthConfig {
  config?: UnifiedAuthConfig;
  path?: string;
}

const configFileNames = [
  "unified-auth.config.ts",
  "unified-auth.config.mts",
  "unified-auth.config.js",
  "unified-auth.config.mjs",
  "unified-auth.config.cjs",
];

export async function loadUnifiedAuthConfig(cwd: string, configPath?: string): Promise<LoadedUnifiedAuthConfig> {
  loadProjectEnv(cwd);

  const path = resolveConfigPath(cwd, configPath);

  if (!path) {
    return {};
  }

  const mod = await loadConfigModule(path);
  const config = readConfigExport(mod);

  return { config, path };
}

function resolveConfigPath(cwd: string, configPath: string | undefined) {
  if (configPath) {
    const path = resolve(cwd, configPath);

    if (!existsSync(path)) {
      throw new Error(`Unified Auth config file not found: ${path}`);
    }

    return path;
  }

  return configFileNames.map((name) => resolve(cwd, name)).find((path) => existsSync(path));
}

async function loadConfigModule(path: string) {
  const extension = extname(path);

  if (extension === ".cjs" || extension === ".cts") {
    return loadCommonJSConfig(path);
  }
  if (extension === ".ts" || extension === ".mts") {
    return loadTypeScriptConfig(path);
  }

  return import(`${pathToFileURL(path).href}?t=${Date.now()}`);
}

function loadCommonJSConfig(path: string) {
  const require = createRequire(import.meta.url);

  return require(path) as Record<string, unknown>;
}

async function loadTypeScriptConfig(path: string) {
  const ts = await import("typescript");
  const source = readFileSync(path, "utf8");
  const output = rewriteConfigImports(ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: basename(path),
  }).outputText);
  const tempPath = resolve(dirname(path), `.unified-auth.config.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}.mjs`);

  writeFileSync(tempPath, output);
  try {
    return await import(`${pathToFileURL(tempPath).href}?t=${Date.now()}`);
  } finally {
    unlinkSync(tempPath);
  }
}

function rewriteConfigImports(output: string) {
  const configModuleURL = new URL("../config.js", import.meta.url).href;

  return output.replace(
    /from\s+["']@rc-tool\/unified-auth-hosted-service\/config["']/g,
    `from ${JSON.stringify(configModuleURL)}`,
  );
}

function readConfigExport(mod: Record<string, unknown>) {
  const value = mod.default ?? mod.config ?? mod.unifiedAuth;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unified Auth config must export a config object as default.");
  }

  return value as UnifiedAuthConfig;
}

function loadProjectEnv(cwd: string) {
  const values = new Map<string, string>();

  for (const name of [".env", ".env.local"]) {
    const path = resolve(cwd, name);

    if (!existsSync(path)) {
      continue;
    }

    for (const [key, value] of parseEnvFile(readFileSync(path, "utf8"))) {
      values.set(key, value);
    }
  }

  for (const [key, value] of values) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseEnvFile(source: string) {
  const values = new Map<string, string>();

  for (const line of source.split(/\r?\n/g)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trimStart() : trimmed;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(normalized);

    if (!match) {
      continue;
    }

    values.set(match[1], parseEnvValue(match[2]));
  }

  return values;
}

function parseEnvValue(rawValue: string) {
  const value = rawValue.trim();

  if (
    (value.startsWith("\"") && value.endsWith("\""))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, "");
}
