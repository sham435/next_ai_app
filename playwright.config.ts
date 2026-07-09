import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL:
      process.env.API_URL || "https://api-production-171d.up.railway.app",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
