import { readFile } from "node:fs/promises";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "https://two-phones-mystery.gabrielteixeira1133.workers.dev";
const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "gabrielteixeira1133@gmail.com";
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
if (!ownerPassword) throw new Error("E2E_OWNER_PASSWORD is required");

const expect = (condition, message) => { if (!condition) throw new Error(message); };
const json = async (path, options = {}, cookie = "") => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body, cookie: response.headers.get("set-cookie")?.split(";", 1)[0] ?? cookie };
};

const health = await json("/api/health");
expect(health.response.ok && health.body.ok, "Health check failed");

const login = await json("/api/admin/login", { method: "POST", body: JSON.stringify({ email: ownerEmail, password: ownerPassword }) });
expect(login.response.ok && login.cookie.startsWith("tpom_admin="), "Owner login failed");

const uploadForm = new FormData();
uploadForm.append("file", new Blob([await readFile("public/evidence/thumbs/maya-reed.webp")], { type: "image/webp" }), `production-smoke-${Date.now()}.webp`);
const upload = await json("/api/admin/assets", { method: "POST", body: uploadForm }, login.cookie);
expect(upload.response.status === 201 && upload.body.key, "R2 upload failed");
const assets = await json("/api/admin/assets", {}, login.cookie);
const uploadedAsset = assets.body.assets?.find((asset) => asset.key === upload.body.key);
expect(uploadedAsset, "Uploaded R2 asset was not indexed");
const media = await fetch(`${base}/media/${upload.body.key}`);
expect(media.ok && media.headers.get("content-type") === "image/webp", "R2 media read failed");
const removed = await json(`/api/admin/assets/${uploadedAsset.id}`, { method: "DELETE" }, login.cookie);
expect(removed.response.ok, "R2 delete failed");

const host = await json("/api/rooms", { method: "POST", body: JSON.stringify({ displayName: "Production smoke" }) });
expect(host.response.status === 201, "Room creation failed");
const code = host.body.state.code;
const field = await json(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ displayName: "Payment smoke" }) });
expect(field.response.ok, "Partner join failed");
expect((await json(`/api/rooms/${code}/action`, { method: "POST", body: JSON.stringify({ type: "START" }) }, host.cookie)).response.ok, "Start failed");

expect((await json(`/api/rooms/${code}/action`, { method: "POST", body: JSON.stringify({ type: "SUBMIT_CODE", value: "3719" }) }, field.cookie)).response.ok, "Stage one failed");
const stageTwoState = await json(`/api/rooms/${code}/state`, {}, host.cookie);
expect(stageTwoState.body.state.stage === 2, "Room did not advance to stage two");
expect((await json(`/api/rooms/${code}/action`, { method: "POST", body: JSON.stringify({ type: "SUBMIT_CODE", value: "3042" }) }, host.cookie)).response.ok, "Stage two failed");

const checkout = await json("/api/payments/checkout", { method: "POST", body: JSON.stringify({ roomCode: code }) }, host.cookie);
expect(checkout.response.ok && new URL(checkout.body.url).hostname.endsWith("stripe.com"), "Live Stripe Checkout creation failed");

console.log(JSON.stringify({ ok: true, health: true, r2Crud: true, checkoutLive: true, roomCode: code, checkoutHost: new URL(checkout.body.url).hostname }));
