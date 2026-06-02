# @rc-tool/unified-auth-prisma-store

Prisma/PostgreSQL store adapter for `@rc-tool/unified-auth-hosted-service`.

Install this package only when the hosted auth runtime should persist identity data through the SDK Prisma schema.

## Install

```bash
pnpm add @rc-tool/unified-auth-prisma-store
```

## Usage

```ts
import { createPrismaAuthStore } from "@rc-tool/unified-auth-prisma-store";

const store = createPrismaAuthStore({
  databaseUrl: process.env.AUTH_DATABASE_URL,
});
```

The package includes Prisma schema and migrations for:

- `auth_users`
- `auth_accounts`
- `auth_sessions`

Use `AUTH_DATABASE_URL` for the auth database so business apps can keep their own `DATABASE_URL`.
