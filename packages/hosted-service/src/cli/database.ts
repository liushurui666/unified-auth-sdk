import { Client } from "pg";
import { getAuthRealmSchemaName } from "@rc-tool/unified-auth-sdk/schema";
import { resolveUnifiedAuthConfigValue } from "../config.js";
import type { UnifiedAuthConfig } from "../config.js";
import type { DoctorCheck } from "./config.js";

interface ColumnSpec {
  dataType: string;
  definition: string;
  name: string;
  nullable: boolean;
}

interface IndexSpec {
  name: string;
  sql: (schemaName: string) => string;
}

interface ConstraintSpec {
  name: string;
  sql: (schemaName: string) => string;
  type: "f" | "p";
}

interface TableSpec {
  columns: ColumnSpec[];
  constraints?: ConstraintSpec[];
  indexes?: IndexSpec[];
  name: string;
}

interface ColumnInfo {
  dataType: string;
  isNullable: boolean;
}

interface TableInspection {
  columns: Map<string, ColumnInfo>;
  constraints: Set<string>;
  exists: boolean;
  indexes: Set<string>;
}

export interface AuthDatabaseInspection {
  schemaExists: boolean;
  tables: Map<string, TableInspection>;
}

export interface AuthDatabaseAction {
  label: string;
  sql: string;
}

export interface AuthDatabasePlan {
  actions: AuthDatabaseAction[];
  schemaName: string;
  warnings: string[];
}

export interface AuthDatabaseMigrationResult extends AuthDatabasePlan {
  changed: boolean;
}

const authTableSpecs: TableSpec[] = [
  {
    columns: [
      column("id", "text", "text NOT NULL"),
      column("name", "text", "text NOT NULL"),
      column("email", "text", "text NOT NULL"),
      column("emailVerified", "boolean", "boolean NOT NULL DEFAULT false"),
      column("image", "text", "text", true),
      column("createdAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("updatedAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("role", "text", "text", true),
      column("banned", "boolean", "boolean DEFAULT false", true),
      column("banReason", "text", "text", true),
      column("banExpires", "timestamp with time zone", "timestamp with time zone", true),
      column("feishuTenantKey", "text", "text", true),
      column("feishuTenantName", "text", "text", true),
    ],
    constraints: [
      primaryKey("user_pkey", "user", ["id"]),
    ],
    indexes: [
      index("user_email_unique", (schemaName) => `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON ${tableName(schemaName, "user")} ("email")`),
    ],
    name: "user",
  },
  {
    columns: [
      column("id", "text", "text NOT NULL"),
      column("expiresAt", "timestamp with time zone", "timestamp with time zone NOT NULL"),
      column("token", "text", "text NOT NULL"),
      column("createdAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("updatedAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("ipAddress", "text", "text", true),
      column("userAgent", "text", "text", true),
      column("userId", "text", "text NOT NULL"),
      column("impersonatedBy", "text", "text", true),
    ],
    constraints: [
      primaryKey("session_pkey", "session", ["id"]),
      foreignKey("session_userId_user_id_fk", "session", "userId", "user", "id"),
    ],
    indexes: [
      index("session_token_unique", (schemaName) => `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON ${tableName(schemaName, "session")} ("token")`),
      index("session_user_id_idx", (schemaName) => `CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON ${tableName(schemaName, "session")} ("userId")`),
    ],
    name: "session",
  },
  {
    columns: [
      column("id", "text", "text NOT NULL"),
      column("accountId", "text", "text NOT NULL"),
      column("providerId", "text", "text NOT NULL"),
      column("userId", "text", "text NOT NULL"),
      column("accessToken", "text", "text", true),
      column("refreshToken", "text", "text", true),
      column("idToken", "text", "text", true),
      column("accessTokenExpiresAt", "timestamp with time zone", "timestamp with time zone", true),
      column("refreshTokenExpiresAt", "timestamp with time zone", "timestamp with time zone", true),
      column("scope", "text", "text", true),
      column("password", "text", "text", true),
      column("createdAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("updatedAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
    ],
    constraints: [
      primaryKey("account_pkey", "account", ["id"]),
      foreignKey("account_userId_user_id_fk", "account", "userId", "user", "id"),
    ],
    indexes: [
      index("account_provider_account_unique", (schemaName) => `CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_unique" ON ${tableName(schemaName, "account")} ("providerId", "accountId")`),
      index("account_user_id_idx", (schemaName) => `CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON ${tableName(schemaName, "account")} ("userId")`),
    ],
    name: "account",
  },
  {
    columns: [
      column("id", "text", "text NOT NULL"),
      column("identifier", "text", "text NOT NULL"),
      column("value", "text", "text NOT NULL"),
      column("expiresAt", "timestamp with time zone", "timestamp with time zone NOT NULL"),
      column("createdAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
      column("updatedAt", "timestamp with time zone", "timestamp with time zone NOT NULL DEFAULT now()"),
    ],
    constraints: [
      primaryKey("verification_pkey", "verification", ["id"]),
    ],
    indexes: [
      index("verification_identifier_idx", (schemaName) => `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON ${tableName(schemaName, "verification")} ("identifier")`),
    ],
    name: "verification",
  },
];

export async function migrateUnifiedAuthDatabase(config: UnifiedAuthConfig): Promise<AuthDatabaseMigrationResult> {
  const schemaName = resolveAuthSchemaName(config);
  const client = createPgClient(config);

  await client.connect();
  try {
    const inspection = await inspectAuthDatabase(client, schemaName);
    const plan = buildAuthDatabasePlan(schemaName, inspection);

    if (plan.warnings.length) {
      throw new Error(`Auth database has incompatible existing structure:\n${plan.warnings.join("\n")}`);
    }

    for (const action of plan.actions) {
      await client.query(action.sql);
    }

    return {
      ...plan,
      changed: plan.actions.length > 0,
    };
  } finally {
    await client.end();
  }
}

export async function doctorUnifiedAuthDatabase(config: UnifiedAuthConfig): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const schemaName = resolveAuthSchemaName(config);
  let client: Client;

  try {
    client = createPgClient(config);
  } catch (error) {
    return [fail(error instanceof Error ? error.message : "database config is invalid")];
  }

  try {
    await client.connect();
    checks.push(pass("database connection is usable"));

    const inspection = await inspectAuthDatabase(client, schemaName);
    const plan = buildAuthDatabasePlan(schemaName, inspection);

    if (inspection.schemaExists) {
      checks.push(pass(`auth schema ${schemaName} exists`));
    } else {
      checks.push(fail(`auth schema ${schemaName} is missing; run unified-auth db migrate`));
    }

    for (const spec of authTableSpecs) {
      const table = inspection.tables.get(spec.name);

      if (table?.exists) {
        checks.push(pass(`table ${schemaName}.${spec.name} exists`));
      } else {
        checks.push(fail(`table ${schemaName}.${spec.name} is missing; run unified-auth db migrate`));
      }
    }

    for (const warning of plan.warnings) {
      checks.push(fail(warning));
    }
    if (plan.actions.length === 0 && plan.warnings.length === 0) {
      checks.push(pass("auth database schema is up to date"));
    } else if (plan.actions.length > 0) {
      checks.push(fail(`auth database schema has ${plan.actions.length} pending migration action(s)`));
      for (const action of plan.actions) {
        checks.push(warn(`pending migration: ${action.label}`));
      }
    }
  } catch (error) {
    checks.push(fail(error instanceof Error ? error.message : "database check failed"));
  } finally {
    await client.end().catch(() => undefined);
  }

  return checks;
}

export function buildAuthDatabasePlan(schemaName: string, inspection: AuthDatabaseInspection): AuthDatabasePlan {
  const actions: AuthDatabaseAction[] = [];
  const warnings: string[] = [];

  if (!inspection.schemaExists) {
    actions.push({
      label: `create schema ${schemaName}`,
      sql: `CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schemaName)}`,
    });
  }

  for (const spec of authTableSpecs) {
    const inspected = inspection.tables.get(spec.name);

    if (!inspected?.exists) {
      actions.push({
        label: `create table ${schemaName}.${spec.name}`,
        sql: createTableSQL(schemaName, spec),
      });
      for (const constraint of spec.constraints?.filter((item) => item.type !== "p") ?? []) {
        actions.push({
          label: `add constraint ${schemaName}.${constraint.name}`,
          sql: constraint.sql(schemaName),
        });
      }
      addIndexes(actions, schemaName, spec, new Set());
      continue;
    }

    for (const expected of spec.columns) {
      const actual = inspected.columns.get(expected.name);

      if (!actual) {
        actions.push({
          label: `add column ${schemaName}.${spec.name}.${expected.name}`,
          sql: `ALTER TABLE ${tableName(schemaName, spec.name)} ADD COLUMN IF NOT EXISTS ${quoteIdent(expected.name)} ${expected.definition}`,
        });
        continue;
      }
      if (!isTypeCompatible(actual.dataType, expected.dataType)) {
        warnings.push(`column ${schemaName}.${spec.name}.${expected.name} has type ${actual.dataType}, expected ${expected.dataType}`);
      }
      if (actual.isNullable !== expected.nullable) {
        warnings.push(`column ${schemaName}.${spec.name}.${expected.name} nullability is ${actual.isNullable ? "nullable" : "not nullable"}, expected ${expected.nullable ? "nullable" : "not nullable"}`);
      }
    }

    for (const constraint of spec.constraints ?? []) {
      if (!inspected.constraints.has(constraint.name)) {
        actions.push({
          label: `add constraint ${schemaName}.${constraint.name}`,
          sql: constraint.sql(schemaName),
        });
      }
    }

    addIndexes(actions, schemaName, spec, inspected.indexes);
  }

  return {
    actions,
    schemaName,
    warnings,
  };
}

async function inspectAuthDatabase(client: Client, schemaName: string): Promise<AuthDatabaseInspection> {
  const schemaResult = await client.query<{ exists: boolean }>(
    "select exists(select 1 from information_schema.schemata where schema_name = $1) as exists",
    [schemaName],
  );
  const tableRows = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = $1 and table_type = 'BASE TABLE'",
    [schemaName],
  );
  const tables = new Map<string, TableInspection>();

  for (const spec of authTableSpecs) {
    tables.set(spec.name, {
      columns: new Map(),
      constraints: new Set(),
      exists: tableRows.rows.some((row) => row.table_name === spec.name),
      indexes: new Set(),
    });
  }

  const columnRows = await client.query<{
    column_name: string;
    data_type: string;
    is_nullable: "YES" | "NO";
    table_name: string;
  }>(
    `select table_name, column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema = $1`,
    [schemaName],
  );

  for (const row of columnRows.rows) {
    const table = tables.get(row.table_name);

    if (table) {
      table.columns.set(row.column_name, {
        dataType: row.data_type,
        isNullable: row.is_nullable === "YES",
      });
    }
  }

  const indexRows = await client.query<{ indexname: string; tablename: string }>(
    "select tablename, indexname from pg_indexes where schemaname = $1",
    [schemaName],
  );

  for (const row of indexRows.rows) {
    tables.get(row.tablename)?.indexes.add(row.indexname);
  }

  const constraintRows = await client.query<{ conname: string; relname: string }>(
    `select c.conname, t.relname
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = $1`,
    [schemaName],
  );

  for (const row of constraintRows.rows) {
    tables.get(row.relname)?.constraints.add(row.conname);
  }

  return {
    schemaExists: Boolean(schemaResult.rows[0]?.exists),
    tables,
  };
}

function createPgClient(config: UnifiedAuthConfig) {
  const connectionString = resolveUnifiedAuthConfigValue(config.database?.url);

  if (!connectionString) {
    throw new Error("database.url is missing in unified-auth.config.ts");
  }

  return new Client({
    connectionString,
    ssl: config.database?.ssl,
  });
}

function resolveAuthSchemaName(config: UnifiedAuthConfig) {
  return getAuthRealmSchemaName(config.realm ?? config.app?.id);
}

function addIndexes(actions: AuthDatabaseAction[], schemaName: string, spec: TableSpec, existing: Set<string>) {
  for (const item of spec.indexes ?? []) {
    if (!existing.has(item.name)) {
      actions.push({
        label: `create index ${schemaName}.${item.name}`,
        sql: item.sql(schemaName),
      });
    }
  }
}

function createTableSQL(schemaName: string, spec: TableSpec) {
  const lines = spec.columns.map((item) => `${quoteIdent(item.name)} ${item.definition}`);
  const primary = spec.constraints?.find((constraint) => constraint.type === "p");

  if (primary) {
    lines.push(primary.sql(schemaName).replace(/^ALTER TABLE .+ ADD CONSTRAINT /, "CONSTRAINT "));
  }

  return `CREATE TABLE IF NOT EXISTS ${tableName(schemaName, spec.name)} (\n  ${lines.join(",\n  ")}\n)`;
}

function column(name: string, dataType: string, definition: string, nullable = false): ColumnSpec {
  return {
    dataType,
    definition,
    name,
    nullable,
  };
}

function primaryKey(name: string, table: string, columns: string[]): ConstraintSpec {
  return {
    name,
    sql: (schemaName) => `ALTER TABLE ${tableName(schemaName, table)} ADD CONSTRAINT ${quoteIdent(name)} PRIMARY KEY (${columns.map(quoteIdent).join(", ")})`,
    type: "p",
  };
}

function foreignKey(name: string, table: string, columnName: string, targetTable: string, targetColumn: string): ConstraintSpec {
  return {
    name,
    sql: (schemaName) => `ALTER TABLE ${tableName(schemaName, table)} ADD CONSTRAINT ${quoteIdent(name)} FOREIGN KEY (${quoteIdent(columnName)}) REFERENCES ${tableName(schemaName, targetTable)} (${quoteIdent(targetColumn)}) ON DELETE CASCADE`,
    type: "f",
  };
}

function index(name: string, sql: (schemaName: string) => string): IndexSpec {
  return { name, sql };
}

function tableName(schemaName: string, name: string) {
  return `${quoteIdent(schemaName)}.${quoteIdent(name)}`;
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function isTypeCompatible(actual: string, expected: string) {
  if (actual === expected) {
    return true;
  }
  if (expected === "text") {
    return actual === "character varying";
  }

  return false;
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
