import { doctorAuthEnv, initAuthEnv } from "./env.js";
import type { DoctorCheck, InitAuthEnvOptions } from "./env.js";

type Output = Pick<typeof console, "error" | "log">;

interface ParsedArgs {
  command: string;
  flags: Map<string, string | true>;
}

const helpText = `Unified Auth CLI

Usage:
  unified-auth init [options]
  unified-auth doctor [options]

Options:
  --app <id>             Auth client id. Defaults to the current folder name.
  --name <name>          Display name for the auth application.
  --port <port>          Local auth service port. Defaults to 3005.
  --service-url <url>    Auth service base URL. Defaults to http://localhost:<port>.
  --redirect <url>       Allowed app redirect URI. Defaults to http://localhost:3004/.
  --providers <list>     Comma-separated providers: feishu,google,github.
  --store <provider>     Store provider: file or prisma. Defaults to file.
  --env-file <path>      Env file to update. Defaults to .env.local.
  --example-file <path>  Example env file to update. Defaults to .env.example.
  --cwd <path>           Project directory. Defaults to the current directory.
  --help                 Show this help message.
`;

export function runCli(argv: string[], output: Output = console) {
  const args = parseArgs(argv);

  try {
    if (!args.command || args.command === "help" || args.flags.has("help")) {
      output.log(helpText.trimEnd());
      return 0;
    }
    if (args.command === "init") {
      const result = initAuthEnv(toInitOptions(args.flags));

      output.log("Unified Auth env initialized.");
      printWriteSummary(output, ".env.local", result.env);
      printWriteSummary(output, ".env.example", result.example);
      printWriteSummary(output, ".gitignore", result.gitignore);
      output.log("Run unified-auth doctor to verify the project config.");
      return 0;
    }
    if (args.command === "doctor") {
      const result = doctorAuthEnv({
        cwd: readString(args.flags, "cwd"),
        envFile: readString(args.flags, "env-file"),
      });

      for (const check of result.checks) {
        output.log(formatCheck(check));
      }

      return result.ok ? 0 : 1;
    }

    output.error(`Unknown command: ${args.command}`);
    output.error("Run unified-auth --help for usage.");
    return 1;
  } catch (error) {
    output.error(error instanceof Error ? error.message : "Unified Auth CLI failed.");
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | true>();
  let command = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      command ||= arg;
      continue;
    }

    const inline = /^--([^=]+)=(.*)$/.exec(arg);

    if (inline) {
      flags.set(inline[1], inline[2]);
      continue;
    }

    const name = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      flags.set(name, true);
      continue;
    }

    flags.set(name, next);
    index += 1;
  }

  return { command, flags };
}

function toInitOptions(flags: Map<string, string | true>): InitAuthEnvOptions {
  return {
    app: readString(flags, "app"),
    cwd: readString(flags, "cwd"),
    envFile: readString(flags, "env-file"),
    exampleFile: readString(flags, "example-file"),
    name: readString(flags, "name"),
    port: readNumber(flags, "port"),
    providers: readProviders(flags),
    redirectURI: readString(flags, "redirect"),
    serviceURL: readString(flags, "service-url"),
    store: readStore(flags),
  };
}

function readString(flags: Map<string, string | true>, name: string) {
  const value = flags.get(name);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(flags: Map<string, string | true>, name: string) {
  const value = readString(flags, name);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return parsed;
}

function readProviders(flags: Map<string, string | true>) {
  const value = readString(flags, "providers");

  if (!value) {
    return undefined;
  }

  const providers = value.split(",").map((provider) => provider.trim()).filter(Boolean);
  const allowed = new Set(["feishu", "github", "google"]);

  for (const provider of providers) {
    if (!allowed.has(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  return providers as Array<"feishu" | "github" | "google">;
}

function readStore(flags: Map<string, string | true>) {
  const value = readString(flags, "store");

  if (!value) {
    return undefined;
  }
  if (value === "file" || value === "prisma") {
    return value;
  }

  throw new Error(`Unsupported store provider: ${value}`);
}

function printWriteSummary(output: Output, label: string, summary: { added: string[]; path: string; updated: string[] }) {
  const changes = [
    summary.added.length ? `${summary.added.length} added` : "",
    summary.updated.length ? `${summary.updated.length} updated` : "",
  ].filter(Boolean).join(", ") || "already up to date";

  output.log(`${label}: ${changes} (${summary.path})`);
}

function formatCheck(check: DoctorCheck) {
  const prefix = check.status === "pass" ? "[ok]" : check.status === "warn" ? "[warn]" : "[fail]";

  return `${prefix} ${check.message}`;
}
