import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHostedAuthRouteHandlers } from "./hosted-service/routes.js";
import type { HostedAuthServiceOptions } from "./index.js";

export interface HostedAuthNodeServerOptions extends HostedAuthServiceOptions {
  port?: number;
}

function toRequest(req: IncomingMessage) {
  const host = req.headers.host ?? "localhost";
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0] ?? "http";
  const url = `${protocol}://${host}${req.url ?? "/"}`;

  return new Request(url, {
    headers: req.headers as HeadersInit,
    method: req.method,
  });
}

async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      res.appendHeader("set-cookie", value);
    } else {
      res.setHeader(key, value);
    }
  });

  if (!response.body) {
    res.end();
    return;
  }

  res.end(Buffer.from(await response.arrayBuffer()));
}

export function createHostedAuthNodeServer(options: HostedAuthNodeServerOptions) {
  const handlers = createHostedAuthRouteHandlers(options);

  return createServer(async (req, res) => {
    const request = toRequest(req);

    await sendResponse(res, await handlers.handle(request));
  });
}
