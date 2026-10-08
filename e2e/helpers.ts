import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export const fileEnv = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=", 2) as [string, string]),
);
export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL;
export const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY;
export const SECRET = process.env.SUPABASE_SECRET_KEY!;

export const TEST_PASSWORD = "e2e-password-123";

export async function createUser(
  request: APIRequestContext,
  email: string,
): Promise<void> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}` },
    data: { email, password: TEST_PASSWORD, email_confirm: true },
  });
  expect(res.ok()).toBeTruthy();
}

export async function sessionFor(
  page: Page,
  email: string,
): Promise<Record<string, unknown>> {
  const res = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON },
      data: { email, password: TEST_PASSWORD },
    },
  );
  expect(res.ok()).toBeTruthy();
  return res.json();
}

export async function signIn(page: Page, email: string): Promise<void> {
  const session = await sessionFor(page, email);
  await page.addInitScript(
    ([key, s]) => localStorage.setItem(key, JSON.stringify(s)),
    [`sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`, session],
  );
}

export async function createAdventure(page: Page, name: string): Promise<void> {
  await page.goto("/adventures");
  await page.getByText("Start New Adventure").click();
  await page.getByPlaceholder("Adventure name").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/a\//);
}

export async function shareTokenFor(page: Page): Promise<string> {
  await page.goto("/adventures");
  await page.getByRole("button", { name: "Share" }).first().click();
  const href = await page
    .getByRole("link", { name: "WhatsApp" })
    .getAttribute("href");
  await page.keyboard.press("Escape");
  return decodeURIComponent(href!).match(/\/join\/([0-9a-f-]+)/)![1];
}
