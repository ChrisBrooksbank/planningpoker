import { defineConfig, devices } from "@playwright/test";

// Records the README demo. Run with `npm run demo`.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "record-demo.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    viewport: { width: 1100, height: 760 },
    video: { mode: "on", size: { width: 1100, height: 760 } },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
