import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";

export type HostedAuthProviderId = "dev" | "feishu" | "github" | "google";

export interface HostedAuthUserRecord {
  avatarUrl: string | null;
  createdAt: string;
  email: string | null;
  id: string;
  metadata: Record<string, unknown>;
  name: string | null;
  registrationChannel: HostedAuthProviderId;
  updatedAt: string;
}

export interface HostedAuthAccountRecord {
  createdAt: string;
  email: string | null;
  id: string;
  lastLoginAt: string;
  metadata: Record<string, unknown>;
  provider: HostedAuthProviderId;
  providerAccountId: string;
  updatedAt: string;
  userId: string;
}

export interface HostedAuthSessionRecord {
  clientId: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  provider: HostedAuthProviderId;
  providerAccountId: string;
  updatedAt: string;
  userId: string;
}

export interface HostedAuthStoreState {
  accounts: HostedAuthAccountRecord[];
  sessions: HostedAuthSessionRecord[];
  users: HostedAuthUserRecord[];
}

export interface HostedAuthSessionContext {
  session: HostedAuthSessionRecord;
  user: AuthUser;
}

export interface CreateHostedAuthSessionInput {
  clientId: string;
  expiresAt: string;
  provider: HostedAuthProviderId;
  providerAccountId: string;
  userId: string;
}

export interface HostedAuthStore {
  createSession(input: CreateHostedAuthSessionInput): Promise<HostedAuthSessionRecord>;
  deleteSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Promise<HostedAuthSessionContext | null>;
  upsertOAuthUser(provider: HostedAuthProviderId, providerUser: AuthUser): Promise<AuthUser>;
}
