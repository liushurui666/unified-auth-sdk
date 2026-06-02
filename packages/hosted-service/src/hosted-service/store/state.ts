import { randomBytes } from "node:crypto";
import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import type {
  CreateHostedAuthSessionInput,
  HostedAuthAccountRecord,
  HostedAuthProviderId,
  HostedAuthSessionContext,
  HostedAuthSessionRecord,
  HostedAuthStoreState,
  HostedAuthUserRecord,
} from "./types.js";

export function createEmptyStoreState(): HostedAuthStoreState {
  return {
    accounts: [],
    sessions: [],
    users: [],
  };
}

export function normalizeStoreState(value: unknown): HostedAuthStoreState {
  const state = value && typeof value === "object" ? value as Partial<HostedAuthStoreState> : {};

  return {
    accounts: Array.isArray(state.accounts) ? state.accounts : [],
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    users: Array.isArray(state.users) ? state.users : [],
  };
}

export function upsertOAuthUserInState(
  state: HostedAuthStoreState,
  provider: HostedAuthProviderId,
  providerUser: AuthUser,
): AuthUser {
  const now = new Date().toISOString();
  const providerAccountId = providerUser.id;
  const account = findAccount(state, provider, providerAccountId);
  const user = account ? findOrCreateMissingUser(state, account, providerUser, provider, now) : findOrCreateUser(state, providerUser, provider, now);

  updateUserProfile(user, providerUser, provider, providerAccountId, now);
  upsertAccount(state, user, provider, providerUser, now);

  return toAuthUser(user, provider, providerAccountId, providerUser.metadata);
}

export function createSessionInState(
  state: HostedAuthStoreState,
  input: CreateHostedAuthSessionInput,
): HostedAuthSessionRecord {
  const now = new Date().toISOString();
  const session: HostedAuthSessionRecord = {
    clientId: input.clientId,
    createdAt: now,
    expiresAt: input.expiresAt,
    id: `session_${createId()}`,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    updatedAt: now,
    userId: input.userId,
  };

  state.sessions.push(session);

  return session;
}

export function getSessionInState(
  state: HostedAuthStoreState,
  sessionId: string,
): HostedAuthSessionContext | null {
  const session = state.sessions.find((item) => item.id === sessionId);

  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  const user = state.users.find((item) => item.id === session.userId);

  if (!user) {
    return null;
  }

  const account = findAccount(state, session.provider, session.providerAccountId);

  return {
    session,
    user: toAuthUser(user, session.provider, session.providerAccountId, account?.metadata),
  };
}

export function deleteSessionInState(state: HostedAuthStoreState, sessionId: string) {
  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
}

function findOrCreateUser(
  state: HostedAuthStoreState,
  providerUser: AuthUser,
  provider: HostedAuthProviderId,
  now: string,
) {
  const byEmail = findUserByEmail(state, providerUser.email);

  if (byEmail) {
    return byEmail;
  }

  const user: HostedAuthUserRecord = {
    avatarUrl: providerUser.avatarUrl ?? null,
    createdAt: now,
    email: providerUser.email ?? null,
    id: `auth_${createId()}`,
    metadata: {},
    name: providerUser.name ?? null,
    registrationChannel: provider,
    updatedAt: now,
  };

  state.users.push(user);

  return user;
}

function findOrCreateMissingUser(
  state: HostedAuthStoreState,
  account: HostedAuthAccountRecord,
  providerUser: AuthUser,
  provider: HostedAuthProviderId,
  now: string,
) {
  const user = state.users.find((item) => item.id === account.userId);

  if (user) {
    return user;
  }

  return findOrCreateUser(state, providerUser, provider, now);
}

function updateUserProfile(
  user: HostedAuthUserRecord,
  providerUser: AuthUser,
  provider: HostedAuthProviderId,
  providerAccountId: string,
  now: string,
) {
  user.avatarUrl = providerUser.avatarUrl ?? user.avatarUrl;
  user.email = providerUser.email ?? user.email;
  user.metadata = mergeMetadata(user.metadata, providerUser.metadata, {
    provider,
    providerUserId: providerAccountId,
    registrationChannel: user.registrationChannel,
  });
  user.name = providerUser.name ?? user.name;
  user.updatedAt = now;
}

function upsertAccount(
  state: HostedAuthStoreState,
  user: HostedAuthUserRecord,
  provider: HostedAuthProviderId,
  providerUser: AuthUser,
  now: string,
) {
  const existing = findAccount(state, provider, providerUser.id);
  const metadata = mergeMetadata(providerUser.metadata, {
    provider,
    providerUserId: providerUser.id,
  });

  if (existing) {
    existing.email = providerUser.email ?? existing.email;
    existing.lastLoginAt = now;
    existing.metadata = metadata;
    existing.updatedAt = now;
    existing.userId = user.id;
    return;
  }

  state.accounts.push({
    createdAt: now,
    email: providerUser.email ?? null,
    id: `account_${createId()}`,
    lastLoginAt: now,
    metadata,
    provider,
    providerAccountId: providerUser.id,
    updatedAt: now,
    userId: user.id,
  });
}

function toAuthUser(
  user: HostedAuthUserRecord,
  provider: HostedAuthProviderId,
  providerAccountId: string,
  providerMetadata: Record<string, unknown> | undefined,
): AuthUser {
  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    id: user.id,
    metadata: mergeMetadata(user.metadata, providerMetadata, {
      provider,
      providerUserId: providerAccountId,
      registrationChannel: user.registrationChannel,
    }),
    name: user.name,
  };
}

function findAccount(state: HostedAuthStoreState, provider: HostedAuthProviderId, providerAccountId: string) {
  return state.accounts.find((item) => item.provider === provider && item.providerAccountId === providerAccountId);
}

function findUserByEmail(state: HostedAuthStoreState, email: string | null | undefined) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return undefined;
  }

  return state.users.find((item) => normalizeEmail(item.email) === normalized);
}

function mergeMetadata(...items: Array<Record<string, unknown> | undefined>) {
  return items.reduce<Record<string, unknown>>((result, item) => ({
    ...result,
    ...(item ?? {}),
  }), {});
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || undefined;
}

function createId() {
  return randomBytes(12).toString("base64url");
}
