import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

async function english(context: BrowserContext) { await context.addInitScript(() => localStorage.setItem("tpom-locale", "en-US")); }
async function digits(page: Page, code: string) { for (const digit of code) await page.getByRole("button", { name: digit, exact: true }).click(); await page.getByRole("button", { name: "SUBMIT", exact: true }).click(); }
async function createPair(browser: Browser) {
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fieldContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await english(hostContext); await english(fieldContext);
  const host = await hostContext.newPage(); const field = await fieldContext.newPage();
  await host.goto("/play"); await host.getByLabel("Your name or alias").fill("Gabriel"); await host.getByRole("button", { name: "CREATE SECURE ROOM" }).click();
  await expect(host).toHaveURL(/\/play\/[A-Z0-9]{6}/); const code = host.url().split("/").at(-1)!;
  await field.goto(`/join/${code}`); await field.getByLabel("Your name or alias").fill("Alex"); await field.getByRole("button", { name: "JOIN INVESTIGATION" }).click();
  await expect(host.getByText("Both packets are online.")).toBeVisible(); await host.getByRole("button", { name: /START CASE/ }).click();
  return { hostContext, fieldContext, host, field, code };
}

test("two phones receive different evidence and complete ROOM 404", async ({ browser }) => {
  const { hostContext, fieldContext, host, field } = await createPair(browser);
  await expect(host.getByText("THE FOUR CARDS")).toBeVisible(); await expect(field.getByText("MAYA'S NOTE")).toBeVisible();
  await digits(field, "3719"); await expect(host.getByText("MAYA'S FIELD NOTES")).toBeVisible(); await expect(field.getByText("REC_001.WAV")).toBeVisible();
  await host.reload(); await expect(host.getByText("MAYA'S FIELD NOTES")).toBeVisible();
  await digits(host, "3042"); await expect(host.getByText(/YOU FOUND THE DOOR/)).toBeVisible();
  await host.getByRole("button", { name: "CHECK THIS ROOM'S PURCHASE" }).click();
  await expect(host.getByText("No completed purchase was found for this room yet.")).toBeVisible();
  await host.getByRole("button", { name: /UNLOCK FULL CASE/ }).click(); await expect(host.getByText("THE IMPOSSIBLE ALIBI")).toBeVisible();
  await host.getByRole("button", { name: "Owen Pike" }).click(); await host.getByRole("button", { name: "LOCK ANSWER" }).click();
  await field.getByRole("button", { name: "Owen Pike" }).click(); await field.getByRole("button", { name: "LOCK ANSWER" }).click();
  await expect(field.getByText("PACKET INTEGRITY WARNING")).toBeVisible(); await digits(field, "6");
  await field.getByRole("button", { name: "C1" }).click(); await field.getByRole("button", { name: "C3" }).click(); await field.getByRole("button", { name: "C4" }).click(); await field.getByRole("button", { name: "C2" }).click(); await field.getByRole("button", { name: "SUBMIT" }).click();
  await expect(host.getByText("INCOMING CALL")).toBeVisible(); await host.getByRole("button", { name: /DECLINE/ }).click();
  await expect(field.getByText("THE MAINTENANCE PASSAGE")).toBeVisible(); await digits(field, "417"); await expect(field.getByText(/CLEAN SWEEP/)).toBeVisible();
  await host.getByRole("button", { name: "CONTINUE TO FINAL DEDUCTION" }).click();
  await host.getByRole("button", { name: "Owen Pike" }).click(); await host.getByRole("button", { name: "LOCK ANSWER" }).click();
  await field.getByRole("button", { name: "Maintenance passage" }).click(); await field.getByRole("button", { name: "LOCK ANSWER" }).click();
  await expect(host.getByText("CASE CLOSED")).toBeVisible(); await expect(field.getByText("CASE CLOSED")).toBeVisible();
  await hostContext.close(); await fieldContext.close();
});

test("language switcher changes the whole entry flow and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language" }).click(); await page.getByRole("option", { name: /PT-BR/ }).click();
  await expect(page.getByRole("heading", { name: /DOIS CELULARES/ })).toBeVisible(); await page.goto("/play");
  await expect(page.getByLabel("Seu nome ou apelido")).toBeVisible(); await page.reload(); await expect(page.getByRole("button", { name: "CRIAR SALA SEGURA" })).toBeVisible();
});

test("purchase status distinguishes a missing purchase from checkout configuration", async ({ browser }) => {
  const { hostContext, fieldContext, host, field } = await createPair(browser);
  await digits(field, "3719"); await digits(host, "3042");
  await host.getByRole("button", { name: "CHECK THIS ROOM'S PURCHASE" }).click();
  await expect(host.getByText("No completed purchase was found for this room yet.")).toBeVisible();
  await hostContext.close(); await fieldContext.close();
});

test("OWNER login grants legitimate full-case bypass", async ({ browser }) => {
  test.skip(!process.env.E2E_OWNER_PASSWORD, "E2E_OWNER_PASSWORD is required for the owner smoke test");
  const hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fieldContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await english(hostContext); await english(fieldContext);
  const host = await hostContext.newPage(); const field = await fieldContext.newPage();
  await host.goto("/admin/login");
  await host.getByLabel("Email").fill("gabrielteixeira1133@gmail.com");
  await host.getByLabel("Password").fill(process.env.E2E_OWNER_PASSWORD!);
  await host.getByRole("button", { name: "SIGN IN" }).click();
  await expect(host).toHaveURL(/\/admin$/);
  await host.getByRole("button", { name: /rooms/i }).click();
  await host.getByRole("button", { name: "CREATE UNLOCKED TEST ROOM", exact: true }).click();
  await expect(host).toHaveURL(/\/play\/[A-Z0-9]{6}/);
  const code = host.url().split("/").at(-1)!;
  await field.goto(`/join/${code}`);
  await field.getByLabel("Your name or alias").fill("Partner");
  await field.getByRole("button", { name: "JOIN INVESTIGATION" }).click();
  await expect(host.getByText("Both packets are online.")).toBeVisible();
  await host.getByRole("button", { name: /START CASE/ }).click();
  await expect(host.getByRole("button", { name: /hint/i })).toHaveCount(0);
  const removedHintAction = await host.evaluate(async (roomCode) => {
    const response = await fetch(`/api/rooms/${roomCode}/action`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "HINT" }) });
    return { status: response.status, body: await response.json() as { error?: string } };
  }, code);
  expect(removedHintAction).toEqual({ status: 400, body: { error: "INVALID_ACTION" } });
  await digits(field, "3719"); await digits(host, "3042");
  await expect(host.getByText("THE IMPOSSIBLE ALIBI")).toBeVisible();
  await expect(host.getByText(/YOU FOUND THE DOOR/)).not.toBeVisible();
  await hostContext.close(); await fieldContext.close();
});
