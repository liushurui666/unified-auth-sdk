export { createAuthServiceClient } from "./service-client.js";
export type {
  AuthAppearanceConfig,
  AuthApplicationConfig,
  AuthContext,
  AuthProviderId,
  AuthServiceClient,
  AuthServiceClientEndpoints,
  AuthSession,
  AuthUser,
  CreateAuthServiceClientOptions,
  LoginOptions,
  LogoutOptions,
} from "./service-client.js";
export {
  DEFAULT_CALLBACK_URL,
  readCallbackURL,
  sanitizeCallbackURL,
  toAbsoluteUrl,
} from "./redirect.js";
