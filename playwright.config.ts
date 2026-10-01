import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Optional: point at a system Chromium (e.g. in sandboxes without Playwright's browser download)
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH, args: (process.env.PW_CHROMIUM_ARGS ?? "").split(" ").filter(Boolean) }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Builds and serves the production app against the seeded database, forcing the offline mock LLM so the run is deterministic.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { AI_PROVIDER: "mock", ALLOW_MOCK_PROVIDER: "1", RAG_MIN_SIMILARITY: "0.1", MOCK_CHUNK_DELAY_MS: "10" },
  },
});
