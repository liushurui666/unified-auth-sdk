import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import type { HostedAuthServiceOptions } from "../types.js";

type FeishuAccessTokenResponse = {
  access_token: string;
  avatar_url?: string;
  email?: string;
  en_name?: string;
  name?: string;
  open_id?: string;
  union_id?: string;
  user_id?: string;
};

type FeishuAppTokenResponse = {
  app_access_token?: string;
  code: number;
  msg?: string;
};

type FeishuResponse<T> = {
  code: number;
  data?: T;
  message?: string;
  msg?: string;
};

type FeishuUserInfoResponse = {
  avatar_big?: string;
  avatar_middle?: string;
  avatar_url?: string;
  email?: string;
  en_name?: string;
  name?: string;
  open_id?: string;
  union_id?: string;
  user_id?: string;
};

async function getFeishuAppAccessToken(appId: string, appSecret: string) {
  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as FeishuAppTokenResponse;

  if (!response.ok || payload.code !== 0 || !payload.app_access_token) {
    throw new Error(payload.msg || "获取飞书 app_access_token 失败");
  }

  return payload.app_access_token;
}

export async function createUserFromFeishuCode(
  options: HostedAuthServiceOptions,
  code: string,
): Promise<AuthUser> {
  const appId = options.feishu?.appId;
  const appSecret = options.feishu?.appSecret;

  if (!appId || !appSecret) {
    throw new Error("飞书登录未配置");
  }

  const appAccessToken = await getFeishuAppAccessToken(appId, appSecret);
  const tokenPayload = await exchangeFeishuCode(code, appAccessToken);
  const userInfo = await getFeishuUserInfo(tokenPayload.data.access_token);
  const openId = userInfo?.open_id || tokenPayload.data.open_id;

  if (!openId) {
    throw new Error("飞书返回的用户信息缺少 open_id");
  }

  return {
    avatarUrl:
      userInfo?.avatar_big ||
      userInfo?.avatar_middle ||
      userInfo?.avatar_url ||
      tokenPayload.data.avatar_url ||
      null,
    email: userInfo?.email || tokenPayload.data.email || null,
    id: openId,
    metadata: {
      enName: userInfo?.en_name || tokenPayload.data.en_name,
      feishuOpenId: openId,
      feishuUnionId: userInfo?.union_id || tokenPayload.data.union_id,
      feishuUserId: userInfo?.user_id || tokenPayload.data.user_id,
      provider: "feishu",
    },
    name: userInfo?.name || tokenPayload.data.name || "飞书用户",
  };
}

async function exchangeFeishuCode(code: string, appAccessToken: string) {
  const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/access_token", {
    body: JSON.stringify({
      code,
      grant_type: "authorization_code",
    }),
    headers: {
      authorization: `Bearer ${appAccessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as FeishuResponse<FeishuAccessTokenResponse>;

  if (!response.ok || payload.code !== 0 || !payload.data?.access_token) {
    throw new Error(payload.msg || payload.message || "飞书授权码换取 user_access_token 失败");
  }

  return { data: payload.data };
}

async function getFeishuUserInfo(accessToken: string) {
  const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json()) as FeishuResponse<FeishuUserInfoResponse>;

  return payload.code === 0 ? payload.data : null;
}
