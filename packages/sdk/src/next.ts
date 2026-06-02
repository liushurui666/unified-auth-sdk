import { createAuthServer } from "./server";
import type { AuthServer, CreateAuthServerOptions } from "./server";

export type NextAuthRouteHandler = (
  request: Request,
) => ReturnType<AuthServer["handler"]>;

export interface NextAuthHandlers {
  GET: NextAuthRouteHandler;
  POST: NextAuthRouteHandler;
  auth: AuthServer;
}

export function createNextAuthHandlers(options: CreateAuthServerOptions): NextAuthHandlers {
  const auth = createAuthServer(options);
  const handler: NextAuthRouteHandler = (request) => auth.handler(request);

  return {
    GET: handler,
    POST: handler,
    auth,
  };
}
