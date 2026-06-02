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
