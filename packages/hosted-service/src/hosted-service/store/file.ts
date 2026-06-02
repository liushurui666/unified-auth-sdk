import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthUser } from "@rc-tool/unified-auth-sdk/service-client";
import {
  createEmptyStoreState,
  createSessionInState,
  deleteSessionInState,
  getSessionInState,
  normalizeStoreState,
  upsertOAuthUserInState,
} from "./state.js";
import type {
  CreateHostedAuthSessionInput,
  HostedAuthProviderId,
  HostedAuthStore,
  HostedAuthStoreState,
} from "./types.js";

export interface CreateFileAuthStoreOptions {
  filePath: string;
}

export function createFileAuthStore(options: CreateFileAuthStoreOptions): HostedAuthStore {
  let state: HostedAuthStoreState | null = null;
  let queue = Promise.resolve();

  async function readState() {
    if (state) {
      return state;
    }

    try {
      state = normalizeStoreState(JSON.parse(await readFile(options.filePath, "utf8")));
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") {
        throw error;
      }
      state = createEmptyStoreState();
    }

    return state;
  }

  async function writeState(nextState: HostedAuthStoreState) {
    const temporaryPath = `${options.filePath}.tmp`;

    await mkdir(dirname(options.filePath), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
    await rename(temporaryPath, options.filePath);
  }

  async function withState<T>(
    mutates: boolean,
    callback: (current: HostedAuthStoreState) => T | Promise<T>,
  ) {
    const run = async () => {
      const current = await readState();
      const result = await callback(current);

      if (mutates) {
        await writeState(current);
      }

      return result;
    };

    if (!mutates) {
      return queue.then(run);
    }

    // 文件存储用串行队列避免并发登录时互相覆盖写入结果。
    const next = queue.then(run, run);
    queue = next.then(() => undefined, () => undefined);

    return next;
  }

  return {
    createSession(input: CreateHostedAuthSessionInput) {
      return withState(true, (current) => createSessionInState(current, input));
    },
    deleteSession(sessionId: string) {
      return withState(true, (current) => {
        deleteSessionInState(current, sessionId);
      });
    },
    getSession(sessionId: string) {
      return withState(false, (current) => getSessionInState(current, sessionId));
    },
    upsertOAuthUser(provider: HostedAuthProviderId, providerUser: AuthUser) {
      return withState(true, (current) => upsertOAuthUserInState(current, provider, providerUser));
    },
  };
}
