import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import type { HostedAuthServiceOptions } from "../types.js";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  email_verified?: boolean;
  family_name?: string;
  given_name?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

export async function createUserFromGoogleCode(
  options: HostedAuthServiceOptions,
  code: string,
  redirectURI: string,
): Promise<AuthUser> {
  const tokenPayload = await exchangeGoogleCode(options, code, redirectURI);
  const userInfo = await getGoogleUserInfo(tokenPayload.access_token);

  if (!userInfo.sub) {
    throw new Error("Google 返回的用户信息缺少 sub");
  }

  return {
    avatarUrl: userInfo.picture ?? null,
    email: userInfo.email ?? null,
    id: userInfo.sub,
    metadata: {
      emailVerified: userInfo.email_verified,
      familyName: userInfo.family_name,
      givenName: userInfo.given_name,
      googleSub: userInfo.sub,
      provider: "google",
    },
    name: userInfo.name || userInfo.email || "Google 用户",
  };
}

async function exchangeGoogleCode(options: HostedAuthServiceOptions, code: string, redirectURI: string) {
  const clientId = options.google?.clientId;
  const clientSecret = options.google?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error("Google 登录未配置");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectURI,
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google 授权码换取 access_token 失败");
  }

  return { access_token: payload.access_token };
}

async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const userInfo = (await response.json()) as GoogleUserInfoResponse;

  if (!response.ok) {
    throw new Error("Google 用户信息获取失败");
  }

  return userInfo;
}
