# @rc-tool/unified-auth-hosted-service

Hosted Auth runtime for Unified Auth.

Use this package to mount SDK-provided login pages, OAuth routes, session APIs, file/memory stores, and the `unified-auth` CLI.

## Install

```bash
pnpm add @rc-tool/unified-auth-sdk @rc-tool/unified-auth-hosted-service
```

## Next.js Embedded Routes

```ts
import {
  createFileAuthStore,
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";

const LoginPage = createHostedAuthLoginPageComponent({
  backgroundImageUrl: "https://cdn.example.com/auth/login-bg.jpg",
  brandName: "AI 项目管理平台",
  heroTitle: "用企业账号安全登录",
  panelTitle: "飞书登录",
  primaryProvider: "feishu",
  providers: ["feishu", "google", "github"],
});

export const hostedAuth = createHostedAuthRouteHandlers({
  allowDevLogin: process.env.AUTH_ALLOW_DEV_LOGIN !== "false",
  allowedRedirectURIs: [process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/"],
  appName: process.env.AUTH_CLIENT_NAME ?? "AI PM",
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
  loginPageComponent: LoginPage,
  redirectURI: process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/",
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

### 登录页组件

Hosted Auth 登录页是 SDK 内部组件化渲染的黑盒页面。业务方不需要自己拼 OAuth 链接、state、callback 或 session，只需要把 SDK 提供的登录页组件传给 `loginPageComponent`。如果不传组件，SDK 会使用内置默认组件和预设样式。

推荐写法：

```ts
import {
  createFileAuthStore,
  createHostedAuthLoginPageComponent,
  createHostedAuthRouteHandlers,
} from "@rc-tool/unified-auth-hosted-service";

const LoginPage = createHostedAuthLoginPageComponent({
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
});

export const hostedAuth = createHostedAuthRouteHandlers({
  allowedRedirectURIs: [process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/"],
  appName: process.env.AUTH_CLIENT_NAME ?? "AI PM",
  authBaseURL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3004",
  clientId: process.env.AUTH_CLIENT_ID ?? "ai-pm",
  loginPageComponent: LoginPage,
  redirectURI: process.env.AUTH_ALLOWED_REDIRECT_URI ?? "http://localhost:3004/",
  sessionSecret: process.env.AUTH_SESSION_SECRET!,
  store: createFileAuthStore({
    filePath: process.env.AUTH_STORE_FILE ?? ".auth/unified-auth-store.json",
  }),
});
```

组件配置项：

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

业务侧不需要配置多应用数组。内嵌 Hosted Auth 的定位是“当前业务项目自己挂登录页和 `/api/auth/*`”，因此一个项目只需要在 `createHostedAuthRouteHandlers` 上传当前项目的 `clientId`、`appName`、`redirectURI`、`allowedRedirectURIs` 和 `loginPageComponent`。

登录页组件的配置优先级是：

1. `createHostedAuthRouteHandlers({ loginPageComponent })`
2. SDK 默认登录页组件

旧的 `loginPage` 和 `appearance.backgroundImageUrl` 仍然兼容，但新项目推荐用 `loginPageComponent`。

独立 Auth Service 启动器不读取 `AUTH_LOGIN_*` 这类全局样式环境变量；后续如果要做共享域名的独立服务，样式会走服务侧自己的应用配置入口，不要求业务项目在 SDK 接入代码里维护应用数组。

也可以完全自定义组件，但组件只拿 SDK 生成好的 `model`，不需要接触 secret、state 签名、callback 或 session：

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
