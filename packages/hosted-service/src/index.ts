export {
  createHostedAuthLoginPageComponent,
  defaultHostedAuthLoginPageComponent,
  renderLoginPage as renderHostedAuthLoginPage,
} from "./hosted-service/login-page/index.js";
export { defineUnifiedAuthConfig } from "./config.js";
export type {
  UnifiedAuthAppConfig,
  UnifiedAuthConfig,
  UnifiedAuthServiceConfig,
} from "./config.js";
export type { RenderLoginPageParams } from "./hosted-service/login-page/types.js";
export { createHostedAuthRouteHandlers, handleHostedAuthRequest } from "./hosted-service/routes.js";
export type { HostedAuthRouteHandler, HostedAuthRouteHandlers } from "./hosted-service/routes.js";
export { createHostedAuthService } from "./hosted-service/service.js";
export type {
  HostedAuthBetterAuthProviderConfig,
  HostedAuthLoginPageComponent,
  HostedAuthLoginPageConfig,
  HostedAuthLoginPageModel,
  HostedAuthLoginPageProps,
  HostedAuthLoginProviderView,
  HostedAuthLoginProviderId,
  HostedAuthRuntimeEnv,
  HostedAuthServiceOptions,
  HostedBetterAuthProviderId,
  HostedBetterAuthServer,
  HostedBetterAuthSessionResult,
} from "./hosted-service/types.js";
