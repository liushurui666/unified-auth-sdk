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
      clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
      loginPage: {
        backgroundImageUrl: process.env.AUTH_LOGIN_BACKGROUND_URL,
        brandName: "AI 项目管理平台",
        heroTitle: "用企业账号安全登录",
        panelTitle: "飞书登录",
        primaryProvider: "feishu",
        providers: ["feishu", "google", "github"],
      },
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

### 登录页 UI props

Hosted Auth 登录页是 SDK 内部组件化渲染的黑盒页面。业务方不需要自己拼 OAuth 链接、state、callback 或 session，只需要在 `createHostedAuthRouteHandlers` 里传 `loginPage` 配置，效果类似给 UI 组件传 props。

推荐写法：

```ts
export const hostedAuth = createHostedAuthRouteHandlers({
  applications: [
    {
      clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
      loginPage: {
        backgroundImageUrl: "https://cdn.example.com/auth/login-bg.jpg",
        brandLabel: "企业协作入口",
        brandName: "AI 项目管理平台",
        devLoginLabel: "使用开发身份进入",
        footerText: "Powered by Unified Auth",
        heroDescription: "统一身份校验后进入项目驾驶舱。",
        heroTitle: "欢迎回到项目驾驶舱",
        logoUrl: "https://cdn.example.com/auth/logo.png",
        panelDescription: "使用企业授权账号完成登录。",
        panelTitle: "用飞书账号登录",
        primaryProvider: "feishu",
        providers: ["feishu", "google", "github"],
        statusText: "企业 SSO",
      },
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

配置项：

| 字段 | 作用 |
| --- | --- |
| `backgroundImageUrl` | 登录页背景图地址。可以是 CDN、业务项目 public 图片的绝对 URL，或任何浏览器可访问的图片。 |
| `logoUrl` | 左侧品牌图标。未配置时使用 SDK 默认闪电标识。 |
| `brandName` | 左侧品牌名称，默认取应用 `name`。 |
| `brandLabel` / `heroKicker` | 左侧标题上方的小标签。 |
| `heroTitle` | 左侧主标题。 |
| `heroDescription` | 左侧说明文案。 |
| `panelTitle` | 右侧登录面板标题。 |
| `panelDescription` | 右侧登录面板说明。 |
| `primaryProvider` | 主按钮登录方式，可选 `feishu`、`google`、`github`。 |
| `providers` | 登录方式展示顺序和范围，例如只展示 `["feishu"]`。未配置时展示全部已启用 provider。 |
| `statusText` | 右上角状态标签，传空字符串可以隐藏。 |
| `devLoginLabel` | 开发登录入口文案。 |
| `footerText` | 底部说明文案，传空字符串可以隐藏。 |

如果一个 Auth Service 服务多个业务应用，可以给每个 `applications[]` 单独配置 `loginPage`：

```ts
applications: [
  {
    loginPage: {
      backgroundImageUrl: "https://cdn.example.com/ai-pm-login.jpg",
      heroTitle: "欢迎回到 AI PM",
      panelTitle: "用飞书账号登录",
    },
    clientId: "ai-pm",
    name: "AI PM",
    redirectURI: "http://localhost:3004/",
  },
  {
    loginPage: {
      backgroundImageUrl: "https://cdn.example.com/admin-login.jpg",
      heroTitle: "管理员控制台",
      panelTitle: "企业 SSO 登录",
    },
    clientId: "admin-console",
    name: "Admin Console",
    redirectURI: "https://admin.example.com/",
  },
],
```

配置优先级是：

1. `applications[].loginPage`
2. `applications[].appearance.backgroundImageUrl`，仅兼容旧的背景图配置
3. `createHostedAuthRouteHandlers({ loginPage })`
4. `createHostedAuthRouteHandlers({ appearance.backgroundImageUrl })`，仅兼容旧的背景图配置
5. SDK 默认 UI

环境变量仍然可以作为配置来源，但不是必须。比如：

```ts
loginPage: {
  backgroundImageUrl: process.env.AUTH_LOGIN_BACKGROUND_URL,
  heroTitle: process.env.AUTH_LOGIN_HERO_TITLE,
}
```

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
