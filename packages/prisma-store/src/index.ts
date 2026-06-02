import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../prisma/generated/client/index.js";
import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import type {
  CreateHostedAuthSessionInput,
  HostedAuthProviderId,
  HostedAuthSessionRecord,
  HostedAuthStore,
  HostedAuthUserRecord,
} from "@rc-tool/unified-auth-hosted-service";

type PrismaTransaction = Prisma.TransactionClient;
type UserRow = Prisma.HostedAuthUserGetPayload<Record<string, never>>;
type AccountWithUser = Prisma.HostedAuthAccountGetPayload<{ include: { user: true } }>;
type SessionWithUser = Prisma.HostedAuthSessionGetPayload<{ include: { user: true } }>;

export interface CreatePrismaAuthStoreOptions {
  client?: PrismaClient;
  databaseUrl?: string;
}

const globalForPrisma = globalThis as typeof globalThis & {
  unifiedAuthPrisma?: PrismaClient;
};

export function createPrismaAuthStore(options: CreatePrismaAuthStoreOptions = {}): HostedAuthStore {
  const prisma = options.client ?? getPrismaClient(options.databaseUrl);

  // Prisma store 是 HostedAuthStore 的生产实现，只存认证身份、账号绑定和 session。
  return {
    async createSession(input) {
      const session = await prisma.hostedAuthSession.create({
        data: {
          clientId: input.clientId,
          expiresAt: new Date(input.expiresAt),
          id: `session_${createId()}`,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          userId: input.userId,
        },
      });

      return toSessionRecord(session);
    },
    async deleteSession(sessionId: string) {
      await prisma.hostedAuthSession.deleteMany({
        where: { id: sessionId },
      });
    },
    async getSession(sessionId: string) {
      const session = await prisma.hostedAuthSession.findUnique({
        include: { user: true },
        where: { id: sessionId },
      });

      if (!session || session.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      const account = await prisma.hostedAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: session.provider,
            providerAccountId: session.providerAccountId,
          },
        },
      });

      return {
        session: toSessionRecord(session),
        user: toAuthUser(session.user, session.provider, session.providerAccountId, toRecord(account?.metadata)),
      };
    },
    upsertOAuthUser(provider: HostedAuthProviderId, providerUser: AuthUser) {
      return prisma.$transaction((tx) => upsertOAuthUser(tx, provider, providerUser));
    },
  };
}

function getPrismaClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("Prisma Auth Store requires DATABASE_URL.");
  }
  if (!globalForPrisma.unifiedAuthPrisma) {
    globalForPrisma.unifiedAuthPrisma = new PrismaClient({
      adapter: createPostgresAdapter(databaseUrl),
    });
  }

  return globalForPrisma.unifiedAuthPrisma;
}

async function upsertOAuthUser(
  tx: PrismaTransaction,
  provider: HostedAuthProviderId,
  providerUser: AuthUser,
) {
  const providerAccountId = providerUser.id;
  const account = await tx.hostedAuthAccount.findUnique({
    include: { user: true },
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
  });
  // OAuth account 优先匹配 providerAccountId；新 provider 但邮箱相同会绑定到同一个 auth 用户。
  const user = account?.user ?? await findOrCreateUser(tx, provider, providerUser);
  const updatedUser = await updateUserProfile(tx, user, provider, providerAccountId, providerUser);

  await upsertAccount(tx, account, updatedUser.id, provider, providerUser);

  return toAuthUser(updatedUser, provider, providerAccountId, providerUser.metadata);
}

async function findOrCreateUser(
  tx: PrismaTransaction,
  provider: HostedAuthProviderId,
  providerUser: AuthUser,
) {
  const email = normalizeEmail(providerUser.email);
  const existing = email
    ? await tx.hostedAuthUser.findUnique({
        where: { email },
      })
    : null;

  if (existing) {
    return existing;
  }

  return tx.hostedAuthUser.create({
    data: {
      avatarUrl: providerUser.avatarUrl ?? null,
      email,
      id: `auth_${createId()}`,
      metadata: toJson({}),
      name: providerUser.name ?? null,
      registrationChannel: provider,
    },
  });
}

async function updateUserProfile(
  tx: PrismaTransaction,
  user: UserRow,
  provider: HostedAuthProviderId,
  providerAccountId: string,
  providerUser: AuthUser,
) {
  return tx.hostedAuthUser.update({
    data: {
      avatarUrl: providerUser.avatarUrl ?? user.avatarUrl,
      email: normalizeEmail(providerUser.email) ?? user.email,
      metadata: toJson(mergeMetadata(toRecord(user.metadata), providerUser.metadata, {
        provider,
        providerUserId: providerAccountId,
        registrationChannel: user.registrationChannel,
      })),
      name: providerUser.name ?? user.name,
    },
    where: { id: user.id },
  });
}

async function upsertAccount(
  tx: PrismaTransaction,
  account: AccountWithUser | null,
  userId: string,
  provider: HostedAuthProviderId,
  providerUser: AuthUser,
) {
  const now = new Date();
  const metadata = toJson(mergeMetadata(providerUser.metadata, {
    provider,
    providerUserId: providerUser.id,
  }));
  const data = {
    email: normalizeEmail(providerUser.email),
    lastLoginAt: now,
    metadata,
    userId,
  };

  if (account) {
    await tx.hostedAuthAccount.update({
      data,
      where: { id: account.id },
    });
    return;
  }

  await tx.hostedAuthAccount.create({
    data: {
      ...data,
      id: `account_${createId()}`,
      provider,
      providerAccountId: providerUser.id,
    },
  });
}

function toSessionRecord(session: Omit<SessionWithUser, "user">): HostedAuthSessionRecord {
  return {
    clientId: session.clientId,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    id: session.id,
    provider: session.provider as HostedAuthProviderId,
    providerAccountId: session.providerAccountId,
    updatedAt: session.updatedAt.toISOString(),
    userId: session.userId,
  };
}

function toAuthUser(
  user: UserRow | HostedAuthUserRecord,
  provider: string,
  providerAccountId: string,
  providerMetadata: Record<string, unknown> | undefined,
): AuthUser {
  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    id: user.id,
    metadata: mergeMetadata(toRecord(user.metadata), providerMetadata, {
      provider,
      providerUserId: providerAccountId,
      registrationChannel: user.registrationChannel,
    }),
    name: user.name,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function mergeMetadata(...items: Array<Record<string, unknown> | undefined>) {
  return items.reduce<Record<string, unknown>>((result, item) => ({
    ...result,
    ...(item ?? {}),
  }), {});
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function createId() {
  return randomBytes(12).toString("base64url");
}

function createPostgresAdapter(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get("schema") ?? undefined;

  return new PrismaPg({ connectionString: databaseUrl }, schema ? { schema } : undefined);
}
