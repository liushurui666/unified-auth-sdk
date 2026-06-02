import { describe, expect, it } from "vitest";
import { readCallbackURL, sanitizeCallbackURL, toAbsoluteUrl } from "./redirect";

describe("redirect helpers", () => {
  it("keeps internal absolute paths", () => {
    expect(sanitizeCallbackURL("/w/acme/studio")).toBe("/w/acme/studio");
  });

  it("rejects open redirects", () => {
    expect(sanitizeCallbackURL("https://example.com")).toBe("/");
    expect(sanitizeCallbackURL("//example.com")).toBe("/");
    expect(sanitizeCallbackURL("/\\example.com")).toBe("/");
  });

  it("accepts both callbackURL and returnTo", () => {
    expect(readCallbackURL({ callbackURL: "/chat", returnTo: "/join/abc" })).toBe("/chat");
    expect(readCallbackURL({ returnTo: "/join/abc" })).toBe("/join/abc");
  });

  it("builds absolute URLs for OAuth callbacks", () => {
    expect(toAbsoluteUrl("/login", "https://app.example.com/")).toBe(
      "https://app.example.com/login",
    );
    expect(toAbsoluteUrl("https://auth.example.com/callback", "https://app.example.com")).toBe(
      "https://auth.example.com/callback",
    );
  });
});
