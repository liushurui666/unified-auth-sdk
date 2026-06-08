import { loadUnifiedAuthConfig } from "./config-file.js";
import { doctorUnifiedAuthConfig, initUnifiedAuthConfig } from "./config.js";
import { doctorUnifiedAuthDatabase, migrateUnifiedAuthDatabase } from "./database.js";
import type { DoctorCheck } from "./config.js";

type Output = Pick<typeof console, "error" | "log">;

interface ParsedArgs {
  command: string;
  flags: Map<string, string | true>;
  subcommand?: string;
}

const helpText = `Unified Auth CLI

Usage:
  unified-auth init [options]
  unified-auth doctor [options]
  unified-auth db migrate [options]

Options:
  --config <path>        Config file. Defaults to unified-auth.config.ts.
  --cwd <path>           Project directory. Defaults to the current directory.
  --help                 Show this help message.
`;

export async function runCli(argv: string[], output: Output = console) {
  const args = parseArgs(argv);

  try {
    if (!args.command || args.command === "help" || args.flags.has("help")) {
      output.log(helpText.trimEnd());
      return 0;
    }
    if (args.command === "init") {
      const cwd = readString(args.flags, "cwd") ?? process.cwd();
      const result = initUnifiedAuthConfig({
        configPath: readString(args.flags, "config"),
        cwd,
      });

      output.log(result.created ? "Unified Auth config created." : "Unified Auth config already exists.");
      output.log(`Config: ${result.path}`);
      output.log("Optional: run unified-auth doctor to verify the project config.");
      return 0;
    }
    if (args.command === "doctor") {
      const cwd = readString(args.flags, "cwd") ?? process.cwd();
      const loaded = await loadUnifiedAuthConfig(cwd, readString(args.flags, "config"));
      const result = doctorUnifiedAuthConfig(loaded.config, loaded.path);

      if (loaded.config?.database?.url) {
        result.checks.push(...await doctorUnifiedAuthDatabase(loaded.config));
        result.ok = !result.checks.some((check) => check.status === "fail");
      }

      for (const check of result.checks) {
        output.log(formatCheck(check));
      }

      return result.ok ? 0 : 1;
    }
    if (args.command === "db" && args.subcommand === "migrate") {
      const cwd = readString(args.flags, "cwd") ?? process.cwd();
      const loaded = await loadUnifiedAuthConfig(cwd, readString(args.flags, "config"));

      if (!loaded.config) {
        output.error("unified-auth.config.ts is missing; run unified-auth init");
        return 1;
      }

      const result = await migrateUnifiedAuthDatabase(loaded.config);

      output.log(result.changed ? "Unified Auth database migrated." : "Unified Auth database already up to date.");
      output.log(`Schema: ${result.schemaName}`);

      for (const action of result.actions) {
        output.log(`- ${action.label}`);
      }

      return 0;
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
  let subcommand = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      if (!command) {
        command = arg;
      } else if (!subcommand) {
        subcommand = arg;
      }
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

  return { command, flags, subcommand };
}

function readString(flags: Map<string, string | true>, name: string) {
  const value = flags.get(name);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatCheck(check: DoctorCheck) {
  const prefix = check.status === "pass" ? "[ok]" : check.status === "warn" ? "[warn]" : "[fail]";

  return `${prefix} ${check.message}`;
}
