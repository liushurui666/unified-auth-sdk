# @rc-tool/unified-auth-hosted-service

Hosted Auth runtime for Unified Auth.

Use this package to mount SDK-provided login pages, OAuth routes, session APIs, file/memory stores, and the `unified-auth` CLI.

## Install

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service
```

## Next.js Embedded Routes

```ts
import { createFileAuthStore, createHostedAuthRouteHandlers } from "@rc-tool/unified-auth-hosted-service";

export const hostedAuth = createHostedAuthRouteHandlers({
  allowDevLogin: process.env.AUTH_ALLOW_DEV_LOGIN !== "false",
  applications: [
    {
      allowedRedirectURIs: [process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/"],
      appearance: {
        backgroundImageUrl: process.env.AUTH_LOGIN_BACKGROUND_URL,
      },
      clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
      name: process.env.AUTH_CLIENT_NAME ?? "AI PM",
      redirectURI: process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/",
    },
  ],
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  sessionSecret: process.env.AUTH_SESSION_SECRET!,
  store: createFileAuthStore({
    filePath: process.env.AUTH_STORE_FILE ?? ".auth/unified-auth-store.json",
  }),
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

## CLI

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init --app ai-pm --redirect http://localhost:3004/
pnpm dlx @rc-tool/unified-auth-hosted-service doctor
```

The default store is file-based. Install `@rc-tool/unified-auth-prisma-store` only when `AUTH_STORE_PROVIDER=prisma`.

## 配置信息

`@rc-tool/unified-auth-hosted-service` 负责在业务项目里挂载登录页和 `/api/auth/*` 路由。业务项目需要把下面这些配置放进自己的 `.env.local` / `.env.example`，也可以通过 CLI 自动追加缺失项：

```bash
pnpm dlx @rc-tool/unified-auth-hosted-service init --app ai-pm --redirect http://localhost:3004/
```

### 登录页背景图

Hosted Auth 登录页默认带兜底背景图，也支持业务项目覆盖。最简单的方式是在业务项目环境变量里配置：

```env
AUTH_LOGIN_BACKGROUND_URL=https://cdn.example.com/auth/login-bg.jpg
```

然后在 route handler 中传给 `appearance.backgroundImageUrl`：

```ts
export const hostedAuth = createHostedAuthRouteHandlers({
  appearance: {
    backgroundImageUrl: process.env.AUTH_LOGIN_BACKGROUND_URL,
  },
  applications: [
    {
      clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
      name: process.env.AUTH_CLIENT_NAME ?? "AI PM",
      redirectURI: process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/",
    },
  ],
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  sessionSecret: process.env.AUTH_SESSION_SECRET!,
  store: createFileAuthStore({
    filePath: process.env.AUTH_STORE_FILE ?? ".auth/unified-auth-store.json",
  }),
});
```

如果一个 Auth Service 服务多个业务应用，可以给每个 `applications[]` 单独配置：

```ts
applications: [
  {
    appearance: {
      backgroundImageUrl: "https://cdn.example.com/ai-pm-login.jpg",
    },
    clientId: "ai-pm",
    name: "AI PM",
    redirectURI: "http://localhost:3004/",
  },
  {
    appearance: {
      backgroundImageUrl: "https://cdn.example.com/admin-login.jpg",
    },
    clientId: "admin-console",
    name: "Admin Console",
    redirectURI: "https://admin.example.com/",
  },
],
```

配置优先级是：

1. `applications[].appearance.backgroundImageUrl`
2. `createHostedAuthRouteHandlers({ appearance.backgroundImageUrl })`
3. SDK 默认背景图

### 业务应用配置

| 环境变量 | 作用 |
| --- | --- |
| `AUTH_SERVICE_URL` | Auth Service 地址。内嵌模式通常就是业务项目自己的 origin。 |
| `AUTH_CLIENT_ID` | 当前业务应用 id，例如 `ai-pm`。 |
| `AUTH_CLIENT_NAME` | 登录页展示名称，例如 `AI PM`。 |
| `AUTH_ALLOWED_REDIRECT_URI` | 登录成功后允许回跳的地址。 |

### Session 和 Store 配置

| 环境变量 | 作用 |
| --- | --- |
| `AUTH_SESSION_SECRET` | session cookie 签名密钥，CLI 会自动生成。 |
| `AUTH_ALLOW_DEV_LOGIN` | 是否允许开发账号登录，生产环境建议设置为 `false`。 |
| `AUTH_STORE_PROVIDER` | 认证数据存储方式，默认 `file`，可选 `prisma`。 |
| `AUTH_STORE_FILE` | file store 的 JSON 文件路径，默认 `.auth/unified-auth-store.json`。 |
| `AUTH_DATABASE_URL` | Prisma store 的认证库 PostgreSQL 连接串。 |

### OAuth Provider 配置

| Provider | 环境变量 |
| --- | --- |
| 飞书 | `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_REDIRECT_URI` |
| Google | `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REDIRECT_URI` |
| GitHub | `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`GITHUB_REDIRECT_URI` |

内嵌模式下 callback 一般挂在业务项目自己的 `/api/auth/*` 路由：

```env
FEISHU_REDIRECT_URI=http://localhost:3004/api/auth/feishu/callback
GOOGLE_REDIRECT_URI=http://localhost:3004/api/auth/google/callback
GITHUB_REDIRECT_URI=http://localhost:3004/api/auth/github/callback
```
