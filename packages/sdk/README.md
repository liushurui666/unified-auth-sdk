# @rc-tool/unified-auth-sdk

Unified Auth core SDK. It provides a black-box service client plus Better Auth helpers for the Auth Service runtime.

The package does not render the hosted login page and does not implement OAuth callbacks or sessions itself. Use `@rc-tool/unified-auth-hosted-service` when a business app wants to mount the SDK login page and `/api/auth/*` routes on its own origin.

## Install

```bash
pnpm add @rc-tool/unified-auth-sdk
```

For an embedded Better Auth service:

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service better-auth drizzle-orm
```

## Client Boundary

```ts
import { createAuthServiceClient } from "@rc-tool/unified-auth-sdk/service-client";
import config from "@/unified-auth.config";

export const authClient = createAuthServiceClient({ config });

const user = await authClient.getCurrentUser();
const session = await authClient.getSession();
const context = await authClient.getAuthContext();
```

`createAuthServiceClient({ config })` reads the app id, Auth origin, and redirect URI from `unified-auth.config.ts`.

Generate login/logout URLs:

```ts
authClient.getLoginURL({ provider: "feishu" });
authClient.getLogoutURL();
```

The SDK returns identity only:

- `AuthUser.id`, `email`, `name`, `avatarUrl`, `metadata`
- `AuthSession.id`, `userId`, `clientId`, `expiresAt`
- `AuthContext` with `{ user, session }`

Business apps should keep workspace/team/member/role/project data in their own tables and reference `AuthUser.id`.

## Better Auth Server

```ts
import { createAuthServer } from "@rc-tool/unified-auth-sdk/server";
import { db } from "@/db";
import config from "@/unified-auth.config";

export const auth = createAuthServer({
  config,
  database: db,
});
```

`createAuthServer` wraps the latest Better Auth API used by this repo:

- Drizzle adapter for the auth database.
- Better Auth `admin` plugin.
- Better Auth `genericOAuth` plugin for Feishu.
- Built-in Better Auth social providers for Google and GitHub.
- Auth origin, Better Auth secret, and trusted origins from `unified-auth.config.ts`.
- Internal standard Better Auth Drizzle schema, selected by `realm`.

Provider credentials and Better Auth secret should come from the business project's own secret source, typically by referencing `process.env` inside `unified-auth.config.ts`.

Provider callback URLs should use Better Auth routes:

- Feishu generic OAuth: `/api/auth/oauth2/callback/feishu`
- Google: `/api/auth/callback/google`
- GitHub: `/api/auth/callback/github`

## Next Helper

```ts
import { createNextAuthHandlers } from "@rc-tool/unified-auth-sdk/next";
import { db } from "@/db";
import config from "@/unified-auth.config";

export const { GET, POST, auth } = createNextAuthHandlers({
  config,
  database: db,
});
```

`realm: "a"` maps to PostgreSQL schema `auth_a`: two business apps using the same realm share users and sessions; different realms get separate Better Auth table sets in the same database. Advanced users can still pass `schema` explicitly, but normal business apps should not write or maintain Better Auth schema files.

The hosted-service CLI can create and verify those tables:

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service db migrate
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

`db migrate` reads `unified-auth.config.ts`, derives the same `realm`, and compares the real PostgreSQL structure instead of relying on a migration history table.

## Better Auth Client Helper

```ts
import { createAuthClient } from "@rc-tool/unified-auth-sdk/client";
import config from "@/unified-auth.config";

export const authClient = createAuthClient({
  baseURL: config.auth?.origin ?? config.app?.origin,
});
```

## Hosted Login

```ts
import {
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";
import { auth } from "@/lib/auth/server";
import config from "@/unified-auth.config";

const LoginPage = createHostedAuthLoginPageComponent({
  brandName: "AI PM",
  primaryProvider: "feishu",
  providers: ["feishu", "google", "github"],
});

export const hostedAuth = createHostedAuthRouteHandlers({
  auth,
  config,
  loginPageComponent: LoginPage,
});
```

## Local Commands

```bash
pnpm typecheck
pnpm test
pnpm build
```
