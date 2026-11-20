import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: "./e2e/test-results",
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run --cwd server --env-file=.env.test src/index.ts",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        PATH: `${process.env.USERPROFILE}\\.bun\\bin;${process.env.PATH}`,
      },
    },
    {
      command: "bun run --cwd client vite --port 5174 --mode test",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_URL: "http://localhost:3001",
        PATH: `${process.env.USERPROFILE}\\.bun\\bin;${process.env.PATH}`,
      },
    },
  ],
});
