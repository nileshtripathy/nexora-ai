import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://supportai:supportai@localhost:5432/supportai_test";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    fileParallelism: false, // integration tests share one Postgres database
    testTimeout: 30_000,
    env: {
      DATABASE_URL: TEST_DB,
      TEST_DATABASE_URL: TEST_DB,
      AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      AI_PROVIDER: "mock", // deterministic offline LLM + embeddings
      RAG_MIN_SIMILARITY: "0.1",
      OPENAI_API_KEY: "",
      MOCK_CHUNK_DELAY_MS: "0",
    },
  },
});
