import { createHmac, timingSafeEqual } from "node:crypto";

function encodePayload(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodePayload<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSignedToken(payload: unknown, secret: string) {
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function parseSignedToken<T>(token: string | undefined, secret: string): T | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signPayload(payload, secret), signature)) {
    return null;
  }

  return decodePayload<T>(payload);
}

