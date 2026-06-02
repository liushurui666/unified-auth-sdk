import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import {
  createEmptyStoreState,
  createSessionInState,
  deleteSessionInState,
  getSessionInState,
  normalizeStoreState,
  upsertOAuthUserInState,
} from "./state.js";
import type {
  CreateHostedAuthSessionInput,
  HostedAuthProviderId,
  HostedAuthStore,
  HostedAuthStoreState,
} from "./types.js";

export interface CreateMemoryAuthStoreOptions {
  state?: Partial<HostedAuthStoreState>;
}

export function createMemoryAuthStore(options: CreateMemoryAuthStoreOptions = {}): HostedAuthStore {
  const state = options.state ? normalizeStoreState(options.state) : createEmptyStoreState();

  return {
    async createSession(input: CreateHostedAuthSessionInput) {
      return createSessionInState(state, input);
    },
    async deleteSession(sessionId: string) {
      deleteSessionInState(state, sessionId);
    },
    async getSession(sessionId: string) {
      return getSessionInState(state, sessionId);
    },
    async upsertOAuthUser(provider: HostedAuthProviderId, providerUser: AuthUser) {
      return upsertOAuthUserInState(state, provider, providerUser);
    },
  };
}
