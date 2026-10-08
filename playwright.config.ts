import { defineConfig, devices } from "@playwright/test";
import { fileEnv } from "./e2e/helpers";

const host = process.env.HOST || fileEnv.HOST || "localhost";
const baseURL = `https://${host}:5173`;

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
