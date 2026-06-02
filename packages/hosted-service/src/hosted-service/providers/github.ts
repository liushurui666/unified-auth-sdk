import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import type { HostedAuthServiceOptions } from "../types.js";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserInfoResponse = {
  avatar_url?: string | null;
  email?: string | null;
  html_url?: string | null;
  id?: number;
  login?: string;
  name?: string | null;
};

type GitHubEmailResponse = Array<{
  email?: string;
  primary?: boolean;
  verified?: boolean;
}>;

export async function createUserFromGitHubCode(
  options: HostedAuthServiceOptions,
  code: string,
  redirectURI: string,
): Promise<AuthUser> {
  const accessToken = await exchangeGitHubCode(options, code, redirectURI);
  const apiHeaders = createGitHubApiHeaders(accessToken);
  const userInfo = await getGitHubUserInfo(apiHeaders);
  const primaryEmail = userInfo.email ? undefined : await getGitHubPrimaryEmail(apiHeaders);
  const email = userInfo.email ?? primaryEmail?.email ?? null;

  return {
    avatarUrl: userInfo.avatar_url ?? null,
    email,
    id: `github:${userInfo.id}`,
    metadata: {
      emailVerified: primaryEmail?.verified,
      githubDisplayName: userInfo.name,
      githubId: userInfo.id,
      githubLogin: userInfo.login,
      githubUrl: userInfo.html_url,
      provider: "github",
    },
    name: userInfo.login || userInfo.name || email || "GitHub 用户",
  };
}

async function exchangeGitHubCode(options: HostedAuthServiceOptions, code: string, redirectURI: string) {
  const clientId = options.github?.clientId;
  const clientSecret = options.github?.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub 登录未配置");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectURI,
    }),
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = (await response.json()) as GitHubTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "GitHub 授权码换取 access_token 失败");
  }

  return payload.access_token;
}

function createGitHubApiHeaders(accessToken: string) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${accessToken}`,
    "user-agent": "unified-auth-sdk",
    "x-github-api-version": "2022-11-28",
  };
}

async function getGitHubUserInfo(headers: Record<string, string>) {
  const response = await fetch("https://api.github.com/user", { headers });
  const userInfo = (await response.json()) as GitHubUserInfoResponse;

  if (!response.ok || !userInfo.id) {
    throw new Error("GitHub 返回的用户信息缺少 id");
  }

  return userInfo;
}

async function getGitHubPrimaryEmail(headers: Record<string, string>) {
  const response = await fetch("https://api.github.com/user/emails", { headers });

  if (!response.ok) {
    return undefined;
  }

  const emails = (await response.json()) as GitHubEmailResponse;

  return (
    emails.find((item) => item.primary && item.verified) ??
    emails.find((item) => item.verified) ??
    emails.find((item) => item.email)
  );
}
