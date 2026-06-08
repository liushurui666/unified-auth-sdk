# @rc-tool/unified-auth-hosted-service

Hosted Login runtime for Unified Auth. This package is Better Auth-only: it renders the SDK login page, starts provider sign-in through Better Auth, exposes SDK context/session/user endpoints, and passes the rest of `/api/auth/*` directly to `auth.handler`.

It does not ship a file store, memory store, custom OAuth callback implementation, custom session cookie, or standalone auth database adapter.

## Install

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service better-auth drizzle-orm
```

## Next.js Embedded Routes

```ts
import {
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";
import { auth } from "@/lib/auth/server";
import config from "@/unified-auth.config";

export const hostedAuth = createHostedAuthRouteHandlers({
  auth,
  config,
});
```

Customize the hosted login page only when the default page is not enough:

```ts
import {
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";
import { auth } from "@/lib/auth/server";
import config from "@/unified-auth.config";

const LoginPage = createHostedAuthLoginPageComponent({
  backgroundImageUrl: "https://cdn.example.com/auth/login-bg.jpg",
  brandName: "AI 项目管理平台",
  heroTitle: "用企业账号安全登录",
  panelTitle: "飞书登录",
  primaryProvider: "feishu",
  providers: ["feishu", "google", "github"],
});

export const hostedAuth = createHostedAuthRouteHandlers({
  auth,
  config,
  loginPageComponent: LoginPage,
});
```

```ts
// app/login/route.ts
export { GET } from "@/lib/hosted-auth";
```

```ts
// app/logout/route.ts
export { GET } from "@/lib/hosted-auth";
```

```ts
// app/api/auth/[...auth]/route.ts
export { GET, POST } from "@/lib/hosted-auth";
```

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

`createHostedAuthRouteHandlers` reads app id, display name, origin, redirect URI, provider visibility, and realm from `unified-auth.config.ts`. OAuth state, callback verification, account binding, session persistence, cookie refresh, and sign-out are all delegated to Better Auth.

## Provider Routing

Login page provider links point at SDK start routes:

- `/api/auth/feishu/start`
- `/api/auth/google/start`
- `/api/auth/github/start`

Those routes call Better Auth with `disableRedirect: true`, then forward the returned provider URL to the browser.

Remaining Better Auth routes are passed through unchanged, so provider consoles should use Better Auth standard callback paths:

- Feishu generic OAuth: `/api/auth/oauth2/callback/feishu`
- Google: `/api/auth/callback/google`
- GitHub: `/api/auth/callback/github`

If your Better Auth provider id differs from the visible login provider id, map it explicitly:

```ts
createHostedAuthRouteHandlers({
  auth,
  config,
  authProviders: {
    feishu: { providerId: "feishu-primary" },
    github: { scopes: ["read:user", "user:email"] },
  },
});
```

## Login Page Component

Hosted Login is a server-rendered component. Custom components receive only the SDK-generated model; they do not need OAuth secrets, state, sessions, or database access.

```ts
const LoginPage = ({ model }) => {
  const feishu = model.providers.find((provider) => provider.id === "feishu");

  return `<!doctype html>
    <main>
      <h1>${model.appName}</h1>
      <a href="${feishu?.href ?? "#"}">使用飞书登录</a>
    </main>`;
};
```

Default component config:

| Field | Purpose |
| --- | --- |
| `backgroundImageUrl` | Login page background image URL. |
| `logoUrl` | Brand logo URL. |
| `brandName` | Brand/application name. |
| `brandLabel` / `heroKicker` | Small hero label. |
| `heroTitle` / `heroDescription` | Hero title and copy. |
| `panelTitle` / `panelDescription` | Login panel title and copy. |
| `primaryProvider` | Primary provider: `feishu`, `google`, or `github`. |
| `providers` | Visible provider order and subset. |
| `statusText` | Top-right status label; pass `""` to hide. |
| `footerText` | Footer copy; pass `""` to hide. |

## CLI

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

Prepare the auth database and verify the project:

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service db migrate
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

`db migrate` is safe to run repeatedly in CI/CD. It does not require migration records: it compares the real PostgreSQL schema, tables, columns, indexes, and constraints for the configured `realm`, creates compatible missing pieces, and fails on incompatible existing structure.

`doctor` checks the config, database connectivity, selected auth schema, required Better Auth tables, indexes, and constraints.

`realm` selects the auth table namespace. For example, `a` maps to PostgreSQL schema `auth_a`; multiple business projects can share that realm, while another project can use `b` and stay isolated in `auth_b`.
