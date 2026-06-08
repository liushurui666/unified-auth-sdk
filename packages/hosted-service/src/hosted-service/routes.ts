import { createHostedAuthService } from "./service.js";
import type { HostedAuthServiceOptions } from "./types.js";

export type HostedAuthRouteHandler = (request: Request) => Promise<Response>;

export interface HostedAuthRouteHandlers {
  GET: HostedAuthRouteHandler;
  POST: HostedAuthRouteHandler;
  handle: HostedAuthRouteHandler;
  service: ReturnType<typeof createHostedAuthService>;
}

export function createHostedAuthRouteHandlers(options: HostedAuthServiceOptions): HostedAuthRouteHandlers {
  const service = createHostedAuthService(options);
  const handle = async (request: Request) => {
    try {
      return await handleHostedAuthRequest(service, request);
    } catch (error) {
      return new Response(error instanceof Error ? error.message : "Auth service error", {
        status: 500,
      });
    }
  };

  return {
    GET: handle,
    POST: handle,
    handle,
    service,
  };
}

export async function handleHostedAuthRequest(
  service: ReturnType<typeof createHostedAuthService>,
  request: Request,
) {
  const path = new URL(request.url).pathname;

  if (path === "/login") {
    return service.handleLogin(request);
  }
  if (path === "/logout") {
    return service.handleLogout(request);
  }
  if (path === "/api/auth/context") {
    return service.handleContext(request);
  }
  if (path === "/api/auth/feishu/start") {
    return service.handleFeishuStart(request);
  }
  if (path === "/api/auth/google/start") {
    return service.handleGoogleStart(request);
  }
  if (path === "/api/auth/github/start") {
    return service.handleGitHubStart(request);
  }
  if (path === "/api/auth/me" || path === "/api/auth/user") {
    return service.handleUser(request);
  }
  if (path === "/api/auth/session") {
    return service.handleSession(request);
  }
  if (path.startsWith("/api/auth/")) {
    return service.handleAuthRequest(request);
  }

  return new Response("Not found", { status: 404 });
}
