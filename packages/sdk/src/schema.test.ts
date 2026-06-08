import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  createAuthDrizzleSchema,
  getAuthRealmSchemaName,
  normalizeAuthRealmId,
} from "./schema";

describe("auth drizzle schema", () => {
  it("normalizes realm ids into stable postgres schema names", () => {
    expect(normalizeAuthRealmId("A")).toBe("a");
    expect(normalizeAuthRealmId("AI PM")).toBe("ai_pm");
    expect(normalizeAuthRealmId("")).toBe("default");
    expect(getAuthRealmSchemaName("a")).toBe("auth_a");
    expect(getAuthRealmSchemaName("auth_b")).toBe("auth_b");
  });

  it("exports the Better Auth model keys expected by the drizzle adapter", () => {
    const schema = createAuthDrizzleSchema("AI PM");
    const userTable = getTableConfig(schema.user);
    const accountTable = getTableConfig(schema.account);
    const sessionColumns = getTableConfig(schema.session).columns.map((column) => column.name);
    const userColumns = userTable.columns.map((column) => column.name);

    expect(Object.keys(schema).sort()).toEqual(["account", "session", "user", "verification"]);
    expect(userTable.schema).toBe("auth_ai_pm");
    expect(accountTable.name).toBe("account");
    expect(sessionColumns).toContain("impersonatedBy");
    expect(userColumns).toContain("feishuTenantKey");
  });
});
