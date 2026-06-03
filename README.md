# Unified Auth packages

通用认证 SDK。目标形态是：认证逻辑、用户表、OAuth、会话和登录页都由 Auth Service 承担；业务项目只通过 `clientId` 接入，读取当前用户和会话，并跳转到 Hosted Login。

仓库现在拆成三个 npm 包，业务项目按需要安装：

- `@rc-tool/unified-auth-sdk`：轻量黑盒客户端、redirect helper，以及迁移期 Better Auth helper。
- `@rc-tool/unified-auth-hosted-service`：登录页、Next route handler、file/memory store 和 `unified-auth init/doctor` CLI。
- `@rc-tool/unified-auth-prisma-store`：可选 Prisma/PostgreSQL store、schema、migration 和 generated client。

业务项目默认只需要 `@rc-tool/unified-auth-sdk`。如果要把登录页和 `/api/auth/*` 内嵌到业务项目自己的域名下，再安装 `@rc-tool/unified-auth-hosted-service`。需要认证库落 PostgreSQL 时再安装 `@rc-tool/unified-auth-prisma-store`。

## 安装

只消费黑盒认证上下文：

```bash
pnpm add @rc-tool/unified-auth-sdk
```

把登录页和认证接口内嵌到业务项目自己的 Next.js 路由：

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service
```

认证数据要落 PostgreSQL/Prisma 时，再安装可选 store：

```bash
pnpm add @rc-tool/unified-auth-prisma-store
```

pnpm 可以正常从 npm registry 拉取这三个包。刚发布新包名后的几十秒里，npm 的 install metadata 可能短暂不同步；后续项目直接 `pnpm add` 即可。

## 目标架构

```text
业务项目
  - AuthProvider / createAuthServiceClient
  - login / logout / getCurrentUser / getSession
  - 用 authUserId 关联自己的 workspace/team/project 成员表

Auth Service
  - 持有 Better Auth 配置
  - 持有用户、会话、账号和应用配置表
  - 根据 clientId 渲染 Hosted Login
  - 提供 session/me/context 查询接口
```

## 包职责

- `@rc-tool/unified-auth-sdk/service-client`：`createAuthServiceClient` 和 `AuthContext` 等黑盒客户端类型。
- `@rc-tool/unified-auth-sdk/redirect`：`sanitizeCallbackURL` / `readCallbackURL` / `toAbsoluteUrl`。
- `@rc-tool/unified-auth-sdk/server`、`/next`、`/client`：迁移期 Better Auth helper。
- `@rc-tool/unified-auth-hosted-service`：`createHostedAuthRouteHandlers`、`createFileAuthStore`、`createMemoryAuthStore`。
- `@rc-tool/unified-auth-prisma-store`：`createPrismaAuthStore`。

## 业务项目接入

业务项目只需要知道 Auth Service 地址和自己的 `clientId`：

```ts
import { createAuthServiceClient } from "@rc-tool/unified-auth-sdk/service-client";

export const auth = createAuthServiceClient({
  authBaseURL: "https://auth.example.com",
  clientId: "workspace-app",
  defaultRedirectURI: "https://workspace.example.com/auth/callback",
});
```

页面或服务端逻辑里读取认证上下文：

```ts
const user = await auth.getCurrentUser();
const session = await auth.getSession();
```

跳转 Hosted Login：

```ts
auth.login({ provider: "feishu" });
auth.logout();
```

如果项目需要自己控制跳转：

```ts
const loginURL = auth.getLoginURL({
  provider: "github",
  redirectURI: "https://workspace.example.com/auth/callback",
});
```

## 应用与登录页组件

core SDK 的应用配置用于描述业务应用身份和登录入口偏好；Hosted Login 的页面 UI 由 `@rc-tool/unified-auth-hosted-service` 的 `loginPageComponent` 控制。不传组件时会使用 SDK 默认组件和预设样式。

```ts
import type { AuthApplicationConfig } from "@rc-tool/unified-auth-sdk";

export const appConfig: AuthApplicationConfig = {
  authBaseURL: "https://auth.example.com",
  clientId: "workspace-app",
  name: "Workspace App",
  allowedRedirectURIs: ["https://workspace.example.com/auth/callback"],
  appearance: {
    logoUrl: "https://workspace.example.com/logo.svg",
    primaryColor: "#2563eb",
    providers: ["feishu", "google", "github", "email"],
    radius: 8,
    theme: "system",
    title: "Workspace App",
  },
};
```

如果业务项目使用内嵌 Hosted Auth，可以使用 SDK 提供的默认登录页组件：

```ts
const LoginPage = createHostedAuthLoginPageComponent({
  backgroundImageUrl: "https://cdn.example.com/auth/login-bg.jpg",
  brandName: "AI 项目管理平台",
  heroTitle: "用企业账号安全登录",
  panelTitle: "飞书登录",
  primaryProvider: "feishu",
  providers: ["feishu", "google", "github"],
});

createHostedAuthRouteHandlers({
  loginPageComponent: LoginPage,
  // ...
});
```

多个业务应用共用一套 Auth Service 时，也可以写到 `applications[].loginPageComponent`，按 `clientId` 分别展示不同品牌 UI。旧的 `loginPage` 和 `appearance.backgroundImageUrl` 仍然兼容，但新项目推荐使用 `loginPageComponent`。

## 内嵌 Hosted Auth 路由

如果希望登录页和认证接口都挂在业务项目自己的域名下，可以在业务项目里复用 SDK 导出的路由 handler。以 Next.js App Router 为例：

```ts
// src/lib/hosted-auth.ts
import {
  createFileAuthStore,
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";

const LoginPage = createHostedAuthLoginPageComponent({
  backgroundImageUrl: process.env.AUTH_LOGIN_BACKGROUND_URL,
  brandName: process.env.AUTH_CLIENT_NAME ?? "AI PM",
  heroTitle: "用企业账号安全登录",
  panelTitle: "飞书登录",
  primaryProvider: "feishu",
  providers: ["feishu", "google", "github"],
});

export const hostedAuth = createHostedAuthRouteHandlers({
  allowDevLogin: process.env.AUTH_ALLOW_DEV_LOGIN !== "false",
  applications: [
    {
      allowedRedirectURIs: [process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/"],
      clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
      name: process.env.AUTH_CLIENT_NAME ?? "AI PM",
      redirectURI: process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/",
    },
  ],
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  loginPageComponent: LoginPage,
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    redirectURI: process.env.FEISHU_REDIRECT_URI,
  },
  sessionSecret: process.env.AUTH_SESSION_SECRET!,
  store: createFileAuthStore({ filePath: process.env.AUTH_STORE_FILE ?? ".auth/unified-auth-store.json" }),
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

这样 PM 登录会走 `http://localhost:3004/login` 和 `http://localhost:3004/api/auth/*`，不会跳到独立的 `3005` 服务。

前端或服务端业务代码仍然通过 core SDK 读取上下文：

```ts
import { createAuthServiceClient } from "@rc-tool/unified-auth-sdk/service-client";

export const authClient = createAuthServiceClient({
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
  defaultRedirectURI: "http://localhost:3004/",
});
```

## Auth Service 内部接入

在 Auth Service 项目里创建 Better Auth 实例：

```ts
import { createAuthServer } from "@rc-tool/unified-auth-sdk/server";
import { db } from "@/lib/server/db";
import * as schema from "@/db/schema";

export const auth = createAuthServer({
  database: db,
  schema,
  appName: "Auth Service",
});
```

Next.js App Router 可以直接挂 handler：

```ts
import { createNextAuthHandlers } from "@rc-tool/unified-auth-sdk/next";
import { db } from "@/lib/server/db";
import * as schema from "@/db/schema";

export const { GET, POST } = createNextAuthHandlers({
  database: db,
  schema,
});
```

## 环境变量

业务项目可以用 CLI 自动补齐 Auth Service 本地配置。命令只追加缺失项，不覆盖已有值：

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init --app ai-pm --redirect http://localhost:3004/
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

`npx @rc-tool/unified-auth-hosted-service ...` 也可以使用；pnpm 项目推荐 `pnpm dlx`。

默认使用 file store，因此首次接入不需要数据库。需要 Prisma/PostgreSQL 时显式指定：

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init --store prisma
```

`init` 会维护 `.env.local`、`.env.example` 和 `.gitignore`。生成的 `.env.local` 形如：

```dotenv
AUTH_SERVICE_PORT=3004
AUTH_SERVICE_URL=http://localhost:3004
AUTH_CLIENT_ID=ai-pm
AUTH_CLIENT_NAME=AI PM
AUTH_LOGIN_BACKGROUND_URL=
AUTH_ALLOWED_REDIRECT_URI=http://localhost:3004/
AUTH_SESSION_SECRET=<auto-generated>
AUTH_ALLOW_DEV_LOGIN=true
AUTH_STORE_PROVIDER=file
AUTH_STORE_FILE=.auth/unified-auth-store.json

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3004/api/auth/google/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3004/api/auth/github/callback

FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_REDIRECT_URI=http://localhost:3004/api/auth/feishu/callback
FEISHU_APP_ID2=
FEISHU_APP_SECRET2=
```

如果启用 Prisma store，则额外需要：

```dotenv
AUTH_STORE_PROVIDER=prisma
AUTH_DATABASE_URL=postgresql://user:password@localhost:5432/unified_auth?schema=public
```

迁移期如果飞书 OAuth 还配置在业务项目里，可以只让 SDK 读取 `AUTH_FEISHU_ENV_FILE`
中的 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_REDIRECT_URI` 三个缺失值；
该文件里的数据库和业务变量不会覆盖 SDK 自己的运行配置。
如果 Auth Service 和业务应用从同一个目录启动，优先使用 `AUTH_DATABASE_URL`
配置认证服务自己的 PostgreSQL，避免和业务应用的 `DATABASE_URL` 冲突。

默认飞书 provider：

- `feishu`
- `feishu-secondary`

也可以通过 `feishuProviders` 显式覆盖。

## 数据边界

纯黑盒模式下：

- Auth Service 保存 `user`、`session`、`account` 和应用配置。
- Hosted Auth Service 会为同一个 OAuth 账号稳定返回同一个 `authUserId`；同邮箱的不同 OAuth 账号会绑定到第一次创建的 auth 用户。
- `@rc-tool/unified-auth-prisma-store` 自带 PostgreSQL Prisma schema 和 migration，认证表是 `auth_users`、`auth_accounts`、`auth_sessions`。
- 业务项目自己保存 workspace/team/project、成员关系、角色、业务资料和业务数据，并用 `authUserId` 关联登录用户。
- 业务项目不需要知道 Better Auth 表结构，也不跑认证表 migration。

## 本地开发

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test
pnpm build
```
