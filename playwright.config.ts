import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL, ignoreHTTPSErrors: true },
  projects: [{ name: "Mobile Chrome", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
