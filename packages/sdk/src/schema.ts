import { boolean, index, pgSchema, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const DEFAULT_AUTH_REALM_ID = "default";
export const AUTH_REALM_SCHEMA_PREFIX = "auth_";

export function normalizeAuthRealmId(realmId: string | undefined): string {
  const normalized = (realmId ?? DEFAULT_AUTH_REALM_ID)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return normalized || DEFAULT_AUTH_REALM_ID;
}

export function getAuthRealmSchemaName(realmId: string | undefined): string {
  const normalized = normalizeAuthRealmId(realmId);

  return normalized.startsWith(AUTH_REALM_SCHEMA_PREFIX)
    ? normalized
    : `${AUTH_REALM_SCHEMA_PREFIX}${normalized}`;
}

export function createAuthDrizzleSchema(realmId?: string) {
  const namespace = pgSchema(getAuthRealmSchemaName(realmId));

  const user = namespace.table("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    role: text("role"),
    banned: boolean("banned").default(false),
    banReason: text("banReason"),
    banExpires: timestamp("banExpires", { mode: "date", withTimezone: true }),
    feishuTenantKey: text("feishuTenantKey"),
    feishuTenantName: text("feishuTenantName"),
  }, (table) => ({
    emailUnique: uniqueIndex("user_email_unique").on(table.email),
  }));

  const session = namespace.table("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { mode: "date", withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonatedBy"),
  }, (table) => ({
    tokenUnique: uniqueIndex("session_token_unique").on(table.token),
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }));

  const account = namespace.table("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date", withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date", withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  }, (table) => ({
    providerAccountUnique: uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }));

  const verification = namespace.table("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  }, (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }));

  return {
    account,
    session,
    user,
    verification,
  };
}

export type AuthDrizzleSchema = ReturnType<typeof createAuthDrizzleSchema>;
