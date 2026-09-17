import { defineConfig } from "@playwright/test";

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: remoteBaseUrl ?? "http://localhost:5199",
    browserName: "chromium",
    launchOptions: { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: remoteBaseUrl ? undefined : {
    command: "npm run dev -- --host localhost --port 5199",
    url: "http://localhost:5199/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
