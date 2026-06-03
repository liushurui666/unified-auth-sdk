# @rc-tool/unified-auth-sdk

业务项目接入 Unified Auth 的核心 SDK。

这个包只负责黑盒认证客户端能力：生成登录/退出地址、读取当前登录用户、读取 session/context，并提供少量迁移期 Better Auth helper。它不包含 Hosted Login 页面、不包含 OAuth route handler，也不携带 Prisma schema。业务项目如果还要把登录页和 `/api/auth/*` 挂在自己域名下，需要再安装 `@rc-tool/unified-auth-hosted-service`。

## 适用场景

- 业务项目只想读取统一认证上下文，不想自己维护 OAuth、用户表和 session。
- 业务项目已经有自己的项目、成员、角色、工作区、订单等业务数据，只需要用 `authUserId` 关联登录用户。
- Auth Service 可以是独立服务，也可以通过 `@rc-tool/unified-auth-hosted-service` 内嵌在业务项目自己的 Next.js 路由里。

## 技术选型与包边界

Unified Auth 按“业务项目最小接入成本”和“认证能力可独立演进”来拆包。业务项目不应该因为只想读当前用户，就被迫安装 OAuth runtime、Prisma、PostgreSQL adapter 或认证服务的所有实现细节。

### 包选择

| 包名 | 什么时候安装 | 主要职责 | 不负责什么 |
| --- | --- | --- | --- |
| `@rc-tool/unified-auth-sdk` | 所有业务项目都要装 | 黑盒认证客户端、登录/退出 URL、session/context 查询、类型定义 | 不渲染登录页、不处理 OAuth callback、不带数据库 schema |
| `@rc-tool/unified-auth-hosted-service` | 业务项目要内嵌登录页和 `/api/auth/*` 时安装 | Hosted Login 页面、OAuth start/callback、session cookie、file/memory store、`unified-auth` CLI | 不强制依赖 Prisma，不存业务数据 |
| `@rc-tool/unified-auth-prisma-store` | 认证数据要落 PostgreSQL 时安装 | 认证用户、OAuth account、session 的 Prisma schema/migration/store adapter | 不进入默认安装路径，不接管业务项目的数据库模型 |

### 技术选型

- TypeScript + ESM：包使用标准 ESM 和 `.d.ts` 类型声明，支持现代 Next.js、Vite、Node.js 服务端项目。
- Subpath exports：业务项目通过 `@rc-tool/unified-auth-sdk/service-client` 精准引用黑盒客户端，避免把 server/helper 代码一起卷入前端包。
- Fetch API：SDK 默认使用全局 `fetch`，也允许业务项目传入自定义 `fetcher`，方便在 Next.js 服务端转发 cookie 或接入内部网关。
- 黑盒 Auth Service：业务项目只关心 `clientId`、`authBaseURL` 和 `redirectURI`，不直接操作 OAuth、用户表、账号绑定和 session 签发逻辑。
- Same-origin embedded mode：如果使用 `@rc-tool/unified-auth-hosted-service`，登录页和认证 API 可以挂在业务项目自己的域名下，减少跨域 Cookie、回跳 URL 和本地多端口调试问题。
- File store 默认可用：本地开发默认用 `.auth/unified-auth-store.json`，业务方跑起来不用先准备第二套数据库。
- Prisma store 可选安装：只有生产认证库需要 PostgreSQL 持久化时才安装 `@rc-tool/unified-auth-prisma-store`，避免 core SDK 自带 Prisma 导致 npm 包臃肿。
- 环境变量不写死进 SDK：OAuth secret、session secret、数据库连接都从业务项目环境变量读取，SDK 只提供 CLI 自动追加模板，避免把 secret 打进 npm 包。

### 数据边界

SDK 只负责“身份”，业务项目负责“业务关系”。

SDK 返回：

- `AuthUser.id`：统一认证用户 id，例如 `auth_xxx`。
- `AuthUser.email` / `name` / `avatarUrl`：通用用户资料。
- `AuthUser.metadata`：provider、providerUserId、registrationChannel 等来源信息。
- `AuthSession`：当前 clientId 下的登录会话。

业务项目自己保存：

- workspace / tenant / organization
- member / role / permission
- project / task / order / document
- 通知渠道、业务偏好、业务状态

推荐做法是在业务成员表里保存 `authUserId`，用它关联 SDK 返回的 `AuthUser.id`。不要把业务角色、工作区权限、项目关系写回 SDK。

## 安装

只接黑盒认证客户端：

```bash
pnpm add @rc-tool/unified-auth-sdk
```

如果业务项目也要内嵌登录页和认证接口：

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service
```

如果认证数据还要落 PostgreSQL/Prisma，再额外安装：

```bash
pnpm add @rc-tool/unified-auth-prisma-store
```

## 环境变量

业务项目至少需要知道 Auth Service 地址和自己的 `clientId`：

```dotenv
AUTH_SERVICE_URL=http://localhost:3004
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3004
AUTH_CLIENT_ID=ai-pm
NEXT_PUBLIC_AUTH_CLIENT_ID=ai-pm
AUTH_LOGIN_BACKGROUND_URL=https://cdn.example.com/auth/login-bg.jpg
AUTH_ALLOWED_REDIRECT_URI=http://localhost:3004/
```

如果业务项目把登录页和 `/api/auth/*` 认证接口内嵌到自己项目里，它就会运行你的 Hosted Auth 代码，并负责签发 session cookie、保存认证用户/session 数据。因此需要配置 cookie 签名密钥和认证数据存储方式；这些值可以通过 CLI 自动写入，业务方不需要自己实现认证逻辑：

```dotenv
AUTH_SESSION_SECRET=<random-secret>
AUTH_ALLOW_DEV_LOGIN=true
AUTH_STORE_PROVIDER=file
AUTH_STORE_FILE=.auth/unified-auth-store.json
```

OAuth provider 按需配置：

```dotenv
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_REDIRECT_URI=http://localhost:3004/api/auth/feishu/callback

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3004/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3004/api/auth/github/callback
```

可以用 CLI 自动补齐缺失项。命令只追加缺失变量，不覆盖已有值：

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init --app ai-pm --redirect http://localhost:3004/
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

## 接入方式一：业务项目只消费 Auth Service

适合 Auth Service 已经独立部署好的项目。业务项目只安装 `@rc-tool/unified-auth-sdk`。

### 1. 创建 SDK client

```ts
// src/lib/auth/unified-auth.ts
import { createAuthServiceClient } from "@rc-tool/unified-auth-sdk/service-client";
import type { AuthContext, AuthUser } from "@rc-tool/unified-auth-sdk/service-client";

const DEFAULT_APP_URL = "http://localhost:3004";

function resolveAuthServiceBaseURL() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || window.location.origin;
  }

  return process.env.AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || DEFAULT_APP_URL;
}

function resolveAppBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || DEFAULT_APP_URL;
}

function toAbsoluteAppURL(pathOrURL: string) {
  if (/^https?:\/\//i.test(pathOrURL)) {
    return pathOrURL;
  }

  return new URL(pathOrURL, resolveAppBaseURL()).toString();
}

export function createBusinessAuthClient(options: { fetcher?: typeof fetch } = {}) {
  return createAuthServiceClient({
    authBaseURL: resolveAuthServiceBaseURL(),
    clientId: process.env.NEXT_PUBLIC_AUTH_CLIENT_ID || process.env.AUTH_CLIENT_ID || "ai-pm",
    defaultRedirectURI: toAbsoluteAppURL("/"),
    fetcher: options.fetcher,
  });
}

export function getLoginHref(redirectURI = "/") {
  return createBusinessAuthClient().getLoginURL({
    redirectURI: toAbsoluteAppURL(redirectURI),
  });
}

export function getLogoutHref(redirectURI = "/login") {
  return createBusinessAuthClient().getLogoutURL({
    redirectURI: toAbsoluteAppURL(redirectURI),
  });
}

export function createEmptyAuthContext(): AuthContext {
  return {
    session: null,
    user: null,
  };
}

export function getBusinessUserId(user?: AuthUser | null) {
  return user?.id ?? null;
}
```

### 2. 服务端读取当前用户

Next.js App Router 里需要把浏览器 cookie 转发给 Auth Service：

```ts
// src/lib/auth/session.ts
import { cookies } from "next/headers";
import { createBusinessAuthClient, createEmptyAuthContext } from "@/lib/auth/unified-auth";
import type { AuthContext } from "@rc-tool/unified-auth-sdk/service-client";

function serializeCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
}

export async function getAuthContext(): Promise<AuthContext> {
  const cookieHeader = serializeCookieHeader(await cookies());
  const authClient = createBusinessAuthClient({
    fetcher(input, init) {
      return fetch(input, {
        ...init,
        cache: "no-store",
        headers: {
          ...init?.headers,
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
      });
    },
  });

  try {
    return await authClient.getAuthContext();
  } catch {
    return createEmptyAuthContext();
  }
}
```

### 3. 前端跳转登录和退出

```tsx
// app/login-link.tsx
"use client";

import Link from "next/link";
import { getLoginHref, getLogoutHref } from "@/lib/auth/unified-auth";

export function LoginLink() {
  return <Link href={getLoginHref("/")}>登录</Link>;
}

export function LogoutLink() {
  return <Link href={getLogoutHref("/login")}>退出</Link>;
}
```

### 4. 业务表如何关联用户

SDK 返回的用户 id 是统一认证用户 id，例如 `auth_xxx`。业务项目应该把它保存到自己的业务表里：

```ts
const context = await getAuthContext();

if (!context.user) {
  throw new Error("请先登录");
}

await db.workspaceMember.upsert({
  where: {
    workspaceId_authUserId: {
      workspaceId,
      authUserId: context.user.id,
    },
  },
  create: {
    workspaceId,
    authUserId: context.user.id,
    role: "viewer",
  },
  update: {},
});
```

不要把 workspace、role、permission、project 等业务概念塞回 SDK。SDK 只负责身份，业务项目自己保存业务关系。

## 接入方式二：业务项目内嵌 Hosted Auth

适合不想单独部署 Auth Service 的业务项目。登录页和认证接口都挂在业务项目自己的域名下，例如：

- `http://localhost:3004/login`
- `http://localhost:3004/logout`
- `http://localhost:3004/api/auth/*`

### 1. 安装 hosted-service

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service
```

### 2. 挂载 route handler

```ts
// src/lib/auth/hosted-auth.ts
import {
  createFileAuthStore,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";

const DEFAULT_APP_URL = "http://localhost:3004";

function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function resolveAppBaseURL() {
  return readEnv("AUTH_SERVICE_URL", readEnv("APP_URL", DEFAULT_APP_URL)).replace(/\/$/, "");
}

function resolveRedirectURI() {
  return readEnv("AUTH_ALLOWED_REDIRECT_URI", `${resolveAppBaseURL()}/`);
}

export const hostedAuth = createHostedAuthRouteHandlers({
  allowDevLogin: readEnv("AUTH_ALLOW_DEV_LOGIN", "true") !== "false",
  applications: [
    {
      allowedRedirectURIs: [resolveRedirectURI()],
      appearance: {
        backgroundImageUrl: readEnv("AUTH_LOGIN_BACKGROUND_URL") || undefined,
      },
      clientId: readEnv("AUTH_CLIENT_ID", "ai-pm"),
      name: readEnv("AUTH_CLIENT_NAME", "AI PM"),
      redirectURI: resolveRedirectURI(),
    },
  ],
  authBaseURL: resolveAppBaseURL(),
  feishu: {
    appId: readEnv("FEISHU_APP_ID") || undefined,
    appSecret: readEnv("FEISHU_APP_SECRET") || undefined,
    redirectURI: readEnv("FEISHU_REDIRECT_URI") || undefined,
  },
  github: {
    clientId: readEnv("GITHUB_CLIENT_ID") || undefined,
    clientSecret: readEnv("GITHUB_CLIENT_SECRET") || undefined,
    redirectURI: readEnv("GITHUB_REDIRECT_URI") || undefined,
  },
  google: {
    clientId: readEnv("GOOGLE_CLIENT_ID") || undefined,
    clientSecret: readEnv("GOOGLE_CLIENT_SECRET") || undefined,
    redirectURI: readEnv("GOOGLE_REDIRECT_URI") || undefined,
  },
  sessionSecret: readEnv("AUTH_SESSION_SECRET", readEnv("SESSION_SECRET", "local-auth-secret")),
  store: createFileAuthStore({
    filePath: readEnv("AUTH_STORE_FILE", ".auth/unified-auth-store.json"),
  }),
});

export const GET = hostedAuth.GET;
export const POST = hostedAuth.POST;
```

```ts
// app/login/route.ts
export { GET } from "@/lib/auth/hosted-auth";
```

```ts
// app/logout/route.ts
export { GET } from "@/lib/auth/hosted-auth";
```

```ts
// app/api/auth/[...auth]/route.ts
export { GET, POST } from "@/lib/auth/hosted-auth";
```

### 3. Next.js 转译配置

如果业务项目使用 Next.js/Turbopack，建议把两个包交给 Next 转译：

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@rc-tool/unified-auth-sdk",
    "@rc-tool/unified-auth-hosted-service",
  ],
};

export default nextConfig;
```

### 4. 本地验证

启动业务项目：

```bash
pnpm dev
```

打开登录页：

```txt
http://localhost:3004/login
```

如果开启了 `AUTH_ALLOW_DEV_LOGIN=true`，可以使用开发账号登录。登录后检查认证上下文：

```txt
http://localhost:3004/api/auth/context?client_id=ai-pm
```

正常会返回：

```json
{
  "session": {
    "clientId": "ai-pm",
    "id": "session_xxx",
    "userId": "auth_xxx"
  },
  "user": {
    "id": "auth_xxx",
    "email": "dev@example.com",
    "name": "开发账号"
  }
}
```

## Prisma store 可选接入

默认 file store 适合本地开发和简单验证。如果要把认证用户、OAuth account、session 持久化到 PostgreSQL：

```bash
pnpm add @rc-tool/unified-auth-prisma-store
```

```ts
import { createPrismaAuthStore } from "@rc-tool/unified-auth-prisma-store";

const store = createPrismaAuthStore({
  databaseUrl: process.env.AUTH_DATABASE_URL,
});
```

建议使用 `AUTH_DATABASE_URL` 保存认证库连接，避免和业务项目自己的 `DATABASE_URL` 冲突。

## 常见问题

### 业务项目需要关心环境变量吗？

需要配置本项目自己的 `AUTH_CLIENT_ID`、`AUTH_SERVICE_URL` 和 redirect URI。可以通过 `pnpm dlx @rc-tool/unified-auth-hosted-service init` 自动追加缺失项，业务方不需要手写完整模板。

### SDK 会创建业务用户、角色、工作区吗？

不会。SDK 只返回统一身份和 session。业务项目自己维护成员表、角色表、权限表和业务数据。

### 为什么要拆成多个包？

业务项目只消费认证上下文时，不应该被迫安装 Prisma、PostgreSQL adapter、Hosted Login runtime。拆包后：

- core SDK 轻量，只负责黑盒客户端。
- hosted-service 负责登录页和认证路由。
- prisma-store 只在需要 PostgreSQL 持久化时安装。

### 生产环境要关闭开发登录吗？

要。生产环境设置：

```dotenv
AUTH_ALLOW_DEV_LOGIN=false
```

并配置真实 OAuth provider 的 client id、secret 和 callback URL。
