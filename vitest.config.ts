import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@rc-tool\/unified-auth-sdk\/(.+)$/,
        replacement: fileURLToPath(new URL("./packages/sdk/src/$1.ts", import.meta.url)),
      },
      {
        find: "@rc-tool/unified-auth-sdk",
        replacement: fileURLToPath(new URL("./packages/sdk/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
  },
});
