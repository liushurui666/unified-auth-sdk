import {
  adminClient,
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";

export interface CreateAuthClientOptions {
  baseURL?: string;
}

export type AuthClient = ReturnType<typeof createBetterAuthClient>;

function resolveClientBaseURL(baseURL?: string): string {
  if (baseURL) {
    return baseURL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

export function createAuthClient(options: CreateAuthClientOptions = {}): AuthClient {
  return createBetterAuthClient({
    baseURL: resolveClientBaseURL(options.baseURL),
    plugins: [
      adminClient(),
      genericOAuthClient(),
      inferAdditionalFields<{}, AuthAdditionalFields>({
        user: authUserAdditionalFields,
      }),
    ],
  }) as AuthClient;
}

const authUserAdditionalFields = {
  feishuTenantKey: {
    input: false,
    required: false,
    type: "string",
  },
  feishuTenantName: {
    input: false,
    required: false,
    type: "string",
  },
} as const;

interface AuthAdditionalFields {
  user: typeof authUserAdditionalFields;
}
