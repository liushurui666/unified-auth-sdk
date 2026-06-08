# Unified Auth packages

通用认证 SDK。当前架构只保留 Better Auth 主路径：业务项目用 SDK 生成登录/退出地址和读取认证上下文；登录页和 `/api/auth/*` 可以通过 hosted-service 内嵌到业务项目自己的域名下；用户、账号绑定、session、OAuth callback 和 cookie 都交给 Better Auth。

## Packages

- `@rc-tool/unified-auth-sdk`：黑盒客户端、redirect helper、Better Auth server/client/Next helper。
- `@rc-tool/unified-auth-hosted-service`：Hosted Login 页面、provider start 门面、Next route handler、`unified-auth init/db migrate/doctor` CLI。

仓库不再维护 file/memory store、自研 OAuth callback、自研 session cookie 或 Prisma store adapter。

## Install

只消费认证上下文：

```bash
pnpm add @rc-tool/unified-auth-sdk
```

内嵌登录页和认证接口：

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service better-auth drizzle-orm
```

## Embedded Hosted Auth

```ts
// src/lib/auth/server.ts
import { createAuthServer } from "@rc-tool/unified-auth-sdk/server";
import { db } from "@/db";
import config from "@/unified-auth.config";

export const auth = createAuthServer({
  config,
  database: db,
});
```

```ts
// src/lib/hosted-auth.ts
import { createHostedAuthRouteHandlers } from "@rc-tool/unified-auth-hosted-service";
import { auth } from "@/lib/auth/server";
import config from "@/unified-auth.config";

export const hostedAuth = createHostedAuthRouteHandlers({
  auth,
  config,
});
```

```ts
// app/login/route.ts
export { GET } from "@/lib/hosted-auth";
```

```ts
// app/api/auth/[...auth]/route.ts
export { GET, POST } from "@/lib/hosted-auth";
```

`createAuthServer`、`createHostedAuthRouteHandlers` 和 CLI 都读取同一份 `unified-auth.config.ts`。敏感值不要提交到仓库，业务项目可以在 config 里从自己的密钥系统或 `process.env` 读取。

## Client SDK

```ts
import { createAuthServiceClient } from "@rc-tool/unified-auth-sdk/service-client";
import config from "@/unified-auth.config";

export const authClient = createAuthServiceClient({ config });

const context = await authClient.getAuthContext();
```

## Config

Create `unified-auth.config.ts` in the business project:

```ts
import { defineUnifiedAuthConfig } from "@rc-tool/unified-auth-hosted-service/config";

export default defineUnifiedAuthConfig({
  app: {
    id: "ai-pm",
    name: "AI PM",
    origin: "http://localhost:3004",
    redirectURI: "http://localhost:3004/",
  },
  auth: {
    origin: "http://localhost:3004",
    secret: () => process.env.BETTER_AUTH_SECRET,
  },
  database: {
    url: () => process.env.DATABASE_URL,
  },
  providers: ["feishu", "google", "github"],
  realm: "ai-pm",
});
```

First-time setup creates the config file if it is missing. The CLI reads `unified-auth.config.ts` and does not generate env files:

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init
```

After config is ready, run the database migration and verification:

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service db migrate
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

`db migrate` is idempotent. It inspects the real PostgreSQL schema, tables, columns, indexes, and constraints for the selected `realm`; if something compatible is missing it creates only that missing piece. If an existing column is incompatible, it fails instead of doing a destructive change.

If this app should share users with another app, set the same `realm` in both config files. Deployment pipelines can safely run `unified-auth db migrate` before starting the app and `unified-auth doctor` as a readiness check.

Provider callback URLs should be registered in provider consoles using Better Auth standard routes:

- Feishu generic OAuth: `http://localhost:3004/api/auth/oauth2/callback/feishu`
- Google: `http://localhost:3004/api/auth/callback/google`
- GitHub: `http://localhost:3004/api/auth/callback/github`

## Data Boundary

- Better Auth owns auth tables, OAuth account binding, session lifetime, cookie refresh, and callback handling.
- The SDK exports and uses a standard Better Auth Drizzle schema internally; business apps usually pass `database` and `config`.
- `realm: "a"` maps to PostgreSQL schema `auth_a`; projects with the same realm share one user system, while different realms use separate table sets in the same database.
- Unified Auth SDK owns the black-box client boundary and hosted login shell.
- Business apps own workspace/team/member/role/project data and link them by `AuthUser.id`.

## Local Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```
