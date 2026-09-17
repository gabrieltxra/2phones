import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { bootstrapOwner, parseCookies, randomToken, roomCookie, sessionCookie, sha256, verifyPassword } from "./auth";
import type { Env } from "./env";
export { GameRoom } from "./game-room";

type Variables = { admin?: { id: string; email: string; role: string } };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const jsonBody = async <T>(request: Request, schema: z.ZodType<T>) => schema.safeParse(await request.json().catch(() => null));

app.use("*", secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:", "blob:"],
    mediaSrc: ["'self'", "blob:"], connectSrc: ["'self'", "w:", "wss:"], fontSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'", "https://checkout.stripe.com"],
  },
  referrerPolicy: "strict-origin-when-cross-origin",
}));
app.use("/api/*", cors({ origin: (origin, c) => !origin || origin === new URL(c.req.url).origin ? origin : null, credentials: true }));

app.onError((error, c) => {
  console.error("request_error", error instanceof Error ? error.message : "unknown");
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

const adminFromRequest = async (request: Request, env: Env) => {
  const token = parseCookies(request.headers.get("Cookie")).tpom_admin;
  if (!token) return null;
  const hash = await sha256(token);
  return env.DB.prepare("SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(hash, Date.now()).first<{ id: string; email: string; role: string }>();
};

const requireAdmin = async (c: any, next: () => Promise<void>) => {
  const admin = await adminFromRequest(c.req.raw, c.env);
  if (!admin) return c.json({ error: "UNAUTHORIZED" }, 401);
  c.set("admin", admin);
  await next();
};

const roomStub = (env: Env, code: string) => env.GAME_ROOMS.getByName(code.toUpperCase());
const proxyRoom = (request: Request, env: Env, code: string, path: string, method = request.method, body?: BodyInit) => {
  const url = new URL(request.url); url.pathname = path;
  return roomStub(env, code).fetch(new Request(url, { method, headers: request.headers, body: body ?? (method === "GET" ? undefined : request.body) }));
};
const createRoomCode = async (env: Env) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte % 32]).join("");
    const exists = await env.DB.prepare("SELECT 1 FROM rooms WHERE code=?").bind(code).first();
    if (!exists) return code;
  }
  throw new Error("ROOM_CODE_EXHAUSTED");
};

app.get("/api/health", async (c) => {
  const db = await c.env.DB.prepare("SELECT 1 ok").first<{ ok: number }>();
  return c.json({ ok: db?.ok === 1, service: "two-phones-mystery", time: new Date().toISOString() });
});

app.post("/api/analytics", async (c) => {
  const schema = z.object({ event: z.enum(["landing_view","play_clicked","room_created","invite_opened","partner_joined","case_started","puzzle_started","puzzle_completed","demo_completed","paywall_viewed","checkout_started","checkout_completed","full_case_started","case_completed","share_clicked"]), roomCode: z.string().max(8).optional(), locale: z.enum(["en-US","pt-BR"]).optional() });
  const parsed = await jsonBody(c.req.raw, schema);
  if (!parsed.success) return c.json({ error: "INVALID_EVENT" }, 400);
  let roomId: string | null = null;
  if (parsed.data.roomCode) roomId = (await c.env.DB.prepare("SELECT id FROM rooms WHERE code=?").bind(parsed.data.roomCode).first<{id:string}>())?.id ?? null;
  await c.env.DB.prepare("INSERT INTO analytics_events (id,event_name,room_id,case_id,locale,created_at) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), parsed.data.event, roomId, "case-room-404", parsed.data.locale ?? null, Date.now()).run();
  return c.json({ ok: true });
});

app.post("/api/rooms", async (c) => {
  const parsed = await jsonBody(c.req.raw, z.object({ displayName: z.string().trim().min(1).max(32) }));
  if (!parsed.success) return c.json({ error: "INVALID_NAME" }, 400);
  const ip = c.req.header("CF-Connecting-IP") ?? "local";
  const recent = await c.env.DB.prepare("SELECT COUNT(*) total FROM rooms WHERE created_at>?").bind(Date.now() - 60_000).first<{total:number}>();
  if ((recent?.total ?? 0) > 100 && ip !== "local") return c.json({ error: "RATE_LIMITED" }, 429);
  const code = await createRoomCode(c.env);
  const admin = await adminFromRequest(c.req.raw, c.env);
  const now = Date.now();
  await c.env.DB.prepare("INSERT INTO rooms (id,code,case_id,case_version,host_user_id,status,progress,last_activity_at,created_at) VALUES (?,?,?,?,?,'WAITING',0,?,?)")
    .bind(crypto.randomUUID(), code, "case-room-404", 1, admin?.id ?? null, now, now).run();
  const response = await proxyRoom(c.req.raw, c.env, code, "/create", "POST", JSON.stringify({ code, displayName: parsed.data.displayName, hostUserId: admin?.id, owner: admin?.role === "OWNER" }));
  const payload = await response.json<{ state: unknown; token: string }>();
  await c.env.DB.prepare("INSERT INTO analytics_events (id,event_name,room_id,case_id,created_at) SELECT ?,'room_created',id,case_id,? FROM rooms WHERE code=?").bind(crypto.randomUUID(), now, code).run();
  return c.json({ state: payload.state }, 201, { "Set-Cookie": roomCookie(payload.token) });
});

app.post("/api/rooms/:code/join", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const parsed = await jsonBody(c.req.raw, z.object({ displayName: z.string().trim().min(1).max(32) }));
  if (!parsed.success) return c.json({ error: "INVALID_NAME" }, 400);
  const room = await c.env.DB.prepare("SELECT id FROM rooms WHERE code=?").bind(code).first();
  if (!room) return c.json({ error: "ROOM_NOT_FOUND" }, 404);
  const response = await proxyRoom(c.req.raw, c.env, code, "/join", "POST", JSON.stringify(parsed.data));
  const payload = await response.json<{ state?: unknown; token?: string; error?: string }>();
  if (!response.ok || !payload.token) return c.json(payload, response.status as 400);
  return c.json({ state: payload.state }, 200, { "Set-Cookie": roomCookie(payload.token) });
});

app.get("/api/rooms/:code/state", (c) => proxyRoom(c.req.raw, c.env, c.req.param("code"), "/state"));
app.post("/api/rooms/:code/action", (c) => proxyRoom(c.req.raw, c.env, c.req.param("code"), "/action"));
app.get("/api/rooms/:code/ws", (c) => proxyRoom(c.req.raw, c.env, c.req.param("code"), "/ws"));

app.post("/api/admin/login", async (c) => {
  await bootstrapOwner(c.env);
  const parsed = await jsonBody(c.req.raw, z.object({ email: z.string().email(), password: z.string().min(12).max(200) }));
  if (!parsed.success) return c.json({ error: "INVALID_CREDENTIALS" }, 401);
  const key = await sha256(`${c.req.header("CF-Connecting-IP") ?? "local"}:${parsed.data.email.toLowerCase()}`);
  const attempt = await c.env.DB.prepare("SELECT attempts FROM login_attempts WHERE key=?").bind(key).first<{attempts:number}>();
  if ((attempt?.attempts ?? 0) >= 8) return c.json({ error: "TOO_MANY_ATTEMPTS" }, 429);
  const user = await c.env.DB.prepare("SELECT u.id,u.email,u.role,uc.password_hash,uc.password_salt,uc.iterations FROM users u JOIN user_credentials uc ON uc.user_id=u.id WHERE u.email=?")
    .bind(parsed.data.email).first<{id:string;email:string;role:string;password_hash:string;password_salt:string;iterations:number}>();
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash, user.password_salt, user.iterations))) {
    await c.env.DB.prepare("INSERT INTO login_attempts (key,attempts) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1").bind(key).run();
    return c.json({ error: "INVALID_CREDENTIALS" }, 401);
  }
  await c.env.DB.prepare("DELETE FROM login_attempts WHERE key=?").bind(key).run();
  const token = randomToken(); const now = Date.now();
  await c.env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), user.id, await sha256(token), now + 7 * 86400000, now, now, c.req.header("User-Agent")?.slice(0, 300) ?? null).run();
  return c.json({ user: { email: user.email, role: user.role } }, 200, { "Set-Cookie": sessionCookie(token) });
});

app.post("/api/admin/logout", async (c) => {
  const token = parseCookies(c.req.header("Cookie") ?? null).tpom_admin;
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
  return c.json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
});

app.get("/api/admin/me", requireAdmin, (c) => c.json({ user: c.get("admin") }));

app.get("/api/admin/dashboard", requireAdmin, async (c) => {
  const [rooms, active, completed, purchases, funnel, average] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) value FROM rooms").first<{value:number}>(),
    c.env.DB.prepare("SELECT COUNT(*) value FROM rooms WHERE status IN ('READY','PLAYING','PAYWALL')").first<{value:number}>(),
    c.env.DB.prepare("SELECT COUNT(*) value FROM rooms WHERE status='COMPLETED'").first<{value:number}>(),
    c.env.DB.prepare("SELECT COUNT(*) value FROM purchases WHERE status='COMPLETED'").first<{value:number}>(),
    c.env.DB.prepare("SELECT event_name,COUNT(*) value FROM analytics_events GROUP BY event_name").all<{event_name:string;value:number}>(),
    c.env.DB.prepare("SELECT AVG(completed_at-started_at) value FROM rooms WHERE completed_at IS NOT NULL").first<{value:number|null}>(),
  ]);
  return c.json({ metrics: { totalRooms: rooms?.value ?? 0, activeRooms: active?.value ?? 0, completedCases: completed?.value ?? 0, purchases: purchases?.value ?? 0, averageCompletionMs: average?.value ?? 0 }, funnel: Object.fromEntries(funnel.results.map((row) => [row.event_name, row.value])) });
});

app.get("/api/admin/cases", requireAdmin, async (c) => c.json({ cases: (await c.env.DB.prepare("SELECT * FROM cases ORDER BY created_at").all()).results }));
app.patch("/api/admin/cases/:id", requireAdmin, async (c) => {
  const parsed = await jsonBody(c.req.raw, z.object({ active: z.boolean().optional(), title: z.string().min(1).max(120).optional(), priceCents: z.number().int().min(0).optional() }));
  if (!parsed.success) return c.json({ error: "INVALID_CASE" }, 400);
  const current = await c.env.DB.prepare("SELECT * FROM cases WHERE id=?").bind(c.req.param("id")).first<any>();
  if (!current) return c.json({ error: "NOT_FOUND" }, 404);
  await c.env.DB.prepare("UPDATE cases SET active=?,title=?,price_cents=?,updated_at=? WHERE id=?").bind(parsed.data.active === undefined ? current.active : Number(parsed.data.active), parsed.data.title ?? current.title, parsed.data.priceCents ?? current.price_cents, Date.now(), c.req.param("id")).run();
  return c.json({ ok: true });
});

app.get("/api/admin/rooms", requireAdmin, async (c) => c.json({ rooms: (await c.env.DB.prepare("SELECT r.*,COUNT(rp.id) player_count FROM rooms r LEFT JOIN room_players rp ON rp.room_id=r.id GROUP BY r.id ORDER BY r.created_at DESC LIMIT 100").all()).results }));
app.post("/api/admin/test-room", requireAdmin, async (c) => {
  const admin = c.get("admin")!;
  const code = await createRoomCode(c.env); const now = Date.now();
  await c.env.DB.prepare("INSERT INTO rooms (id,code,case_id,case_version,host_user_id,status,progress,last_activity_at,created_at) VALUES (?,?,?,?,?,'WAITING',0,?,?)")
    .bind(crypto.randomUUID(), code, "case-room-404", 1, admin.id, now, now).run();
  const response = await roomStub(c.env, code).fetch(new Request("https://room/create", { method: "POST", body: JSON.stringify({ code, displayName: "OWNER TEST", hostUserId: admin.id, owner: true }) }));
  const payload = await response.json<{ state: unknown; token: string }>();
  await c.env.DB.prepare("INSERT INTO analytics_events (id,event_name,room_id,case_id,metadata_json,created_at) SELECT ?,'room_created',id,case_id,?,? FROM rooms WHERE code=?")
    .bind(crypto.randomUUID(), JSON.stringify({ source: "admin_unlocked_test" }), now, code).run();
  return c.json({ state: payload.state, code, unlocked: true }, 201, { "Set-Cookie": roomCookie(payload.token) });
});
app.post("/api/admin/rooms/:code/reset", requireAdmin, async (c) => {
  await roomStub(c.env, c.req.param("code")).fetch(new Request("https://room/reset", { method: "POST" }));
  const admin = c.get("admin")!;
  await c.env.DB.prepare("INSERT INTO admin_audit_log (id,user_id,action,target_type,target_id,created_at) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), admin.id, "ROOM_RESET", "room", c.req.param("code"), Date.now()).run();
  return c.json({ ok: true });
});

const allowedMime = new Set(["image/webp","image/jpeg","image/png","audio/mpeg","audio/wav","audio/ogg"]);
app.get("/api/admin/assets", requireAdmin, async (c) => c.json({ assets: (await c.env.DB.prepare("SELECT * FROM assets ORDER BY created_at DESC").all()).results }));
app.post("/api/admin/assets", requireAdmin, async (c) => {
  if (!c.env.MEDIA) return c.json({ error: "R2_NOT_ENABLED" }, 503);
  const admin = c.get("admin")!; const form = await c.req.formData(); const file = form.get("file");
  if (!(file instanceof File) || !allowedMime.has(file.type) || file.size > 12 * 1024 * 1024) return c.json({ error: "INVALID_ASSET" }, 400);
  const key = `uploads/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await c.env.DB.prepare("INSERT INTO assets (id,key,filename,mime_type,size_bytes,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), key, file.name, file.type, file.size, admin.id, Date.now()).run();
  return c.json({ key }, 201);
});
app.delete("/api/admin/assets/:id", requireAdmin, async (c) => {
  if (!c.env.MEDIA) return c.json({ error: "R2_NOT_ENABLED" }, 503);
  const asset = await c.env.DB.prepare("SELECT key FROM assets WHERE id=?").bind(c.req.param("id")).first<{key:string}>();
  if (!asset) return c.json({ error: "NOT_FOUND" }, 404);
  await c.env.MEDIA.delete(asset.key); await c.env.DB.prepare("DELETE FROM assets WHERE id=?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

app.get("/media/*", async (c) => {
  if (!c.env.MEDIA) return c.json({ error: "R2_NOT_ENABLED" }, 503);
  const key = c.req.path.slice("/media/".length); const object = await c.env.MEDIA.get(key);
  if (!object) return c.notFound();
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("ETag", object.httpEtag); headers.set("Cache-Control", "public, max-age=86400");
  return new Response(object.body, { headers });
});

app.post("/api/payments/checkout", async (c) => {
  const parsed = await jsonBody(c.req.raw, z.object({ roomCode: z.string().length(6) }));
  if (!parsed.success) return c.json({ error: "INVALID_ROOM" }, 400);
  const stateResponse = await proxyRoom(c.req.raw, c.env, parsed.data.roomCode, "/state", "GET");
  if (!stateResponse.ok) return c.json({ error: "UNAUTHORIZED" }, 401);
  if (c.env.PAYMENTS_MODE === "mock") {
    await c.env.DB.prepare("INSERT INTO entitlements (id,room_id,case_id,source,created_at) SELECT ?,id,case_id,'MOCK',? FROM rooms WHERE code=? ON CONFLICT(room_id,case_id) DO NOTHING").bind(crypto.randomUUID(), Date.now(), parsed.data.roomCode).run();
    await roomStub(c.env, parsed.data.roomCode).fetch(new Request("https://room/unlock", { method: "POST" }));
    return c.json({ unlocked: true });
  }
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: "PAYMENTS_NOT_CONFIGURED" }, 503);
  const params = new URLSearchParams({ mode: "payment", "payment_method_types[0]": "card", success_url: `${c.env.APP_ORIGIN}/play/${parsed.data.roomCode}?payment=success`, cancel_url: `${c.env.APP_ORIGIN}/play/${parsed.data.roomCode}`, client_reference_id: parsed.data.roomCode, "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][unit_amount]": "499", "line_items[0][price_data][product_data][name]": "ROOM 404 — Full case", "line_items[0][quantity]": "1", "metadata[room_code]": parsed.data.roomCode, "metadata[case_id]": "case-room-404" });
  const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `room404-${parsed.data.roomCode}` }, body: params });
  const session = await stripe.json<any>();
  if (!stripe.ok || !session.url) return c.json({ error: "CHECKOUT_FAILED" }, 502);
  await c.env.DB.prepare("INSERT INTO purchases (id,provider,provider_transaction_id,room_id,case_id,amount_cents,currency,status,idempotency_key,created_at,updated_at) SELECT ?,'stripe',?,id,case_id,499,'USD','PENDING',?,?,? FROM rooms WHERE code=? ON CONFLICT(provider_transaction_id) DO NOTHING")
    .bind(crypto.randomUUID(), session.id, `room404-${parsed.data.roomCode}`, Date.now(), Date.now(), parsed.data.roomCode).run();
  return c.json({ url: session.url });
});

const verifyStripe = async (body: string, header: string, secret: string) => {
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((candidate) => {
    if (candidate.length !== hex.length) return false;
    let difference = 0;
    for (let index = 0; index < hex.length; index += 1) difference |= hex.charCodeAt(index) ^ candidate.charCodeAt(index);
    return difference === 0;
  });
};

app.post("/api/payments/webhook", async (c) => {
  if (!c.env.STRIPE_WEBHOOK_SECRET) return c.json({ error: "WEBHOOK_NOT_CONFIGURED" }, 503);
  const body = await c.req.text(); const signature = c.req.header("Stripe-Signature") ?? "";
  if (!(await verifyStripe(body, signature, c.env.STRIPE_WEBHOOK_SECRET))) return c.json({ error: "INVALID_SIGNATURE" }, 400);
  const event = JSON.parse(body) as any;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object; const code = session.metadata?.room_code;
    if (code && session.payment_status === "paid" && session.amount_total === 499 && session.currency === "usd" && session.metadata?.case_id === "case-room-404") {
      const purchase = await c.env.DB.prepare("SELECT id FROM purchases WHERE provider_transaction_id=?").bind(session.id).first<{id:string}>();
      if (purchase) {
        await c.env.DB.prepare("UPDATE purchases SET status='COMPLETED',updated_at=? WHERE id=?").bind(Date.now(), purchase.id).run();
        await c.env.DB.prepare("INSERT INTO entitlements (id,room_id,case_id,source,purchase_id,created_at) SELECT ?,id,case_id,'STRIPE',?,? FROM rooms WHERE code=? ON CONFLICT(room_id,case_id) DO NOTHING").bind(crypto.randomUUID(), purchase.id, Date.now(), code).run();
        await roomStub(c.env, code).fetch(new Request("https://room/unlock", { method: "POST" }));
      }
    }
  }
  return c.json({ received: true });
});

app.get("/api/payments/status/:code", async (c) => {
  const state = await proxyRoom(c.req.raw, c.env, c.req.param("code"), "/state");
  if (!state.ok) return c.json({ error: "UNAUTHORIZED" }, 401);
  const entitlement = await c.env.DB.prepare("SELECT 1 ok FROM entitlements e JOIN rooms r ON r.id=e.room_id WHERE r.code=?").bind(c.req.param("code")).first();
  if (entitlement) await roomStub(c.env, c.req.param("code")).fetch(new Request("https://room/unlock", { method: "POST" }));
  return c.json({ unlocked: Boolean(entitlement) });
});

export default app;
