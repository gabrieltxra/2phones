import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { PublicRoomState, GameAction } from '../../shared/game';

async function read(page:Page,code:string):Promise<PublicRoomState>{ return page.evaluate(async c=>(await (await fetch(`/api/rooms/${c}/state`)).json()).state,code); }
async function action(page:Page,code:string,action:GameAction){return page.evaluate(async ({code,action})=>{const r=await fetch(`/api/rooms/${code}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});return {status:r.status,body:await r.json()};},{code,action});}

async function english(context: BrowserContext) { await context.addInitScript(() => { if (!localStorage.getItem("tpom-locale")) localStorage.setItem("tpom-locale", "en-US"); }); }
async function digits(page: Page, code: string) { await page.locator("#terminal-code").fill(code); await page.getByRole("button", { name: "SUBMIT", exact: true }).click(); }
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

// Known answer regression; this does not measure human puzzle difficulty.
test("two phones receive different evidence and complete ROOM 404", async ({ browser }) => {
  const { hostContext, fieldContext, host, field, code } = await createPair(browser);
  await expect(host.getByRole("heading", {name:"THE FOUR CARDS"})).toBeVisible(); await expect(field.getByRole("heading", {name:"MAYA'S NOTE"})).toBeVisible();
  await digits(field, "2758"); await expect(host.getByRole("heading", {name:"MAYA'S FIELD NOTES"})).toBeVisible(); await expect(field.getByRole("heading", {name:"REC_001 / M"})).toBeVisible();
  await host.reload(); await expect(host.getByRole("heading", {name:"MAYA'S FIELD NOTES"})).toBeVisible();
  await digits(host, "2031"); await expect(host.getByText(/YOU FOUND THE DOOR/)).toBeVisible();
  await host.getByRole("button", { name: "CHECK THIS ROOM'S PURCHASE" }).click();
  await expect(host.getByText("No completed purchase was found for this room yet.")).toBeVisible();
  expect((await action(host,code,{type:'CONTINUE'})).status).toBe(402);
  expect((await read(host,code)).investigation!.evidence.some(e=>e.stage>=4)).toBe(false);
  await host.getByRole("button", { name: /UNLOCK FULL CASE/ }).click(); await expect(host.getByRole("heading", {name:"ACCESS LOG / UNCORRECTED"})).toBeVisible();
  await host.getByRole("button", { name: "Owen Pike" }).click(); await host.getByRole("button", { name: "LOCK ANSWER" }).click();
  await field.getByRole("button", { name: "Owen Pike" }).click(); await field.getByRole("button", { name: "LOCK ANSWER" }).click();
  await expect(field.getByRole("heading", {name:"PACKET INTEGRITY WARNING"})).toBeVisible(); await digits(field, "4");
  await field.getByRole("button", { name: "C3", exact: true }).click(); await field.getByRole("button", { name: "C1", exact: true }).click(); await field.getByRole("button", { name: "C2", exact: true }).click(); await field.getByRole("button", { name: "C4", exact: true }).click(); await field.getByRole("button", { name: "SUBMIT" }).click();
  await expect(host.getByRole("heading", {name:"INCOMING CALL"})).toBeVisible(); await host.getByRole("button", { name: /DECLINE/ }).click();
  await expect(field.getByRole("heading", {name:"PANEL / INSPECTION"})).toBeVisible(); await digits(field, "417"); await expect(field.getByText(/CLEAN SWEEP/)).toBeVisible();
  await host.getByRole("button", { name: "CONTINUE TO FINAL DEDUCTION" }).click(); await host.getByLabel("Proof", {exact:true}).selectOption("TX-17"); await field.getByLabel("Proof", {exact:true}).selectOption("417");
  await host.getByRole("button", { name: "Owen Pike" }).click(); await host.getByRole("button", { name: "LOCK ANSWER" }).click();
  await field.getByRole("button", { name: "Maintenance passage" }).click(); await field.getByRole("button", { name: "LOCK ANSWER" }).click();
  await expect(host.getByText("CASE CLOSED")).toBeVisible(); await expect(field.getByText("CASE CLOSED")).toBeVisible();
  expect((await read(host,code)).investigation!.evidence.some(e=>e.id==='cards-fragment')).toBe(true);
  await host.screenshot({path:'test-results/investigation-completed.png',fullPage:true});
  await hostContext.close(); await fieldContext.close();
});

test('private packets, invalid actions, persistent manipulation, contextual hint and real partner event',async({browser})=>{
  const {hostContext,fieldContext,host,field,code}=await createPair(browser);
  const a=await read(host,code),f=await read(field,code);
  expect(a.caseVersion).toBe(2);
  expect(a.investigation!.evidence.some(e=>e.id==='photo-row')).toBe(false);
  expect(f.investigation!.evidence.some(e=>e.id==='card-eye')).toBe(false);
  expect(JSON.stringify(f)).not.toContain('2758');
  expect((await action(field,code,{type:'EXAMINE',value:'card-eye'})).status).toBe(400);
  expect((await action(host,code,{type:'START'})).status).toBe(400);
  expect((await action(host,code,{type:'REORDER',value:['card-eye','card-eye','card-eye','card-eye']})).status).toBe(400);
  await host.getByRole('button',{name:'HINT',exact:true}).click();
  await host.getByRole('button',{name:'FLIP',exact:true}).first().click();
  await expect(host.getByText('The eye and the moon were never adjacent.')).toBeVisible();
  await host.getByRole('button',{name:'Move right EYE / 8',exact:true}).click();
  await expect.poll(async()=>(await read(host,code)).investigation!.order[0]).toBe('card-bell');
  const order=(await read(host,code)).investigation!.order;
  await host.reload();await expect(host.getByText('The eye and the moon were never adjacent.')).toBeVisible();
  expect((await read(host,code)).investigation!.order).toEqual(order);
  await host.getByRole('button',{name:'♢ 5 BELL / 5',exact:true}).click();
  await host.getByRole('button',{name:'⚿ 7 KEY / 7',exact:true}).click();
  await expect.poll(async()=>(await read(host,code)).investigation!.order[0]).toBe('card-key');
  await host.locator('.manipulable-card').first().dragTo(host.locator('.manipulable-card').last());
  await expect.poll(async()=>(await read(host,code)).investigation!.order[3]).toBe('card-key');
  await expect(host.getByRole('note')).toContainText('adjacent pairs');
  expect((await read(field,code)).investigation!.hint).toBeUndefined();
  await host.getByRole('button',{name:'NOTIFY PARTNER: ANALYSIS COMPLETE'}).click();
  await expect(field.getByRole('status')).toContainText('partner has completed');
  await digits(field,'9999');expect((await read(field,code)).stage).toBe(1);
  await expect.poll(async()=>(await read(field,code)).attempts).toBe(1);
  await host.getByRole('button',{name:'Language'}).click();await host.getByRole('option',{name:/PT-BR/}).click();
  await expect(host.getByRole('heading',{name:'OS QUATRO CARTÕES'})).toBeVisible();
  await expect(host.getByRole('note')).toContainText('blocos');
  await host.reload();await expect(host.getByText('O olho e a lua nunca ficavam lado a lado.')).toBeVisible();
  expect(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await host.screenshot({path:'test-results/investigation-pt-br.png',fullPage:true});
  await hostContext.close();await fieldContext.close();
});

test('failed deductions release both players and final proof survives reconnect',async({browser})=>{
  const {hostContext,fieldContext,host,field,code}=await createPair(browser);
  await digits(field,'2758');await digits(host,'2031');
  await host.getByRole('button',{name:/UNLOCK FULL CASE/}).click();
  await expect(host.getByRole('heading',{name:'ACCESS LOG / UNCORRECTED'})).toBeVisible();
  for(const page of [host,field])await action(page,code,{type:'VOTE',value:'NAOMI_BROOKS'});
  expect((await read(host,code)).lastEvent).toBe('CONSENSUS_REJECTED');
  for(const page of [host,field]){expect((await read(page,code)).waitingForPartner).toBe(false);await action(page,code,{type:'VOTE',value:'OWEN_PIKE'});}
  await action(field,code,{type:'CONFIRM_DIGIT',value:'4'});
  await field.getByRole('button',{name:'C3',exact:true}).click();await field.reload();
  await expect(field.getByRole('button',{name:'C3 · 1',exact:true})).toBeVisible();
  for(const id of ['C1','C2','C4'])await field.getByRole('button',{name:id,exact:true}).click();
  await field.getByRole('button',{name:'SUBMIT',exact:true}).click();
  await expect(host.getByRole('heading',{name:'INCOMING CALL'})).toBeVisible();
  expect((await action(host,code,{type:'CALL_DECISION',value:'ANSWERED'})).status).toBe(400);
  expect((await read(host,code)).stage).toBe(7);
  await action(host,code,{type:'CALL_DECISION',value:'DECLINED'});
  await field.getByRole('button',{name:'ZOOM IN / OUT'}).click();await expect(field.locator('.inspection-photo')).toHaveClass(/zoomed/);
  // The optional repair note must not be required for completion.
  await action(host,code,{type:'CONTINUE'});
  await action(host,code,{type:'FINAL_ANSWER',value:['OWEN_PIKE','TX-21']});
  await action(field,code,{type:'FINAL_ANSWER',value:['MAINTENANCE_PASSAGE','417']});
  expect((await read(host,code)).lastEvent).toBe('DEDUCTION_INCOMPLETE');
  expect((await read(field,code)).waitingForPartner).toBe(false);
  await host.getByRole('button',{name:'Owen Pike',exact:true}).click();await host.getByLabel('Proof',{exact:true}).selectOption('TX-17');
  await host.reload();await expect(host.getByLabel('Proof',{exact:true})).toHaveValue('TX-17');
  await host.getByRole('button',{name:/^EVIDENCE/}).click();await host.getByRole('button',{name:/WORK ORDERS.*08/}).click();await expect(host.getByRole('heading',{name:'WORK ORDERS'})).toBeVisible();
  await host.getByRole('button',{name:'LOCK ANSWER',exact:true}).click();
  await action(field,code,{type:'FINAL_ANSWER',value:['MAINTENANCE_PASSAGE','417']});
  await expect(host.getByText('CASE CLOSED',{exact:true})).toBeVisible();
  await expect(field.getByText('CASE CLOSED',{exact:true})).toBeVisible();
  expect((await read(host,code)).optionalEvidence).toBe(false);
  await hostContext.close();await fieldContext.close();
});

test("language switcher changes the whole entry flow and persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language" }).click(); await page.getByRole("option", { name: /PT-BR/ }).click();
  await expect(page.getByRole("heading", { name: /DOIS CELULARES/ })).toBeVisible(); await page.goto("/play");
  await expect(page.getByLabel("Seu nome ou apelido")).toBeVisible(); await page.reload(); await expect(page.getByRole("button", { name: "CRIAR SALA SEGURA" })).toBeVisible();
});

test("purchase status distinguishes a missing purchase from checkout configuration", async ({ browser }) => {
  const { hostContext, fieldContext, host, field } = await createPair(browser);
  await digits(field, "2758"); await digits(host, "2031");
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
  await host.getByLabel("Email").fill(process.env.E2E_OWNER_EMAIL ?? "owner@example.test");
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
  await expect(host.getByRole("button", { name: "HINT", exact:true })).toBeVisible();
  await digits(field, "2758"); await digits(host, "2031");
  await expect(host.getByRole("heading", {name:"ACCESS LOG / UNCORRECTED"})).toBeVisible();
  await expect(host.getByText(/YOU FOUND THE DOOR/)).not.toBeVisible();
  await hostContext.close(); await fieldContext.close();
});
