import { expect, test } from "@playwright/test";

for (const width of [1440, 1280, 1024, 768, 430, 390]) {
  test(`landing has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    await page.addInitScript(() => localStorage.setItem("tpom-locale", "en-US"));
    const errors:string[]=[]; page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
    await page.goto("/"); await expect(page.getByRole("heading",{name:/TWO PHONES/})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    if(width===1440||width===390)await page.screenshot({path:`test-results/landing-${width}.png`,fullPage:true});
  });
}
