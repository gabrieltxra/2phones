import type { Context } from "hono";
import type { Env } from "./env";

const encoder = new TextEncoder();

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const bytesToBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

// Cloudflare Workers' PBKDF2 implementation accepts at most 100,000 iterations.
export async function hashPassword(password: string, salt?: string, iterations = 100_000) {
  const saltBytes = salt ? base64ToBytes(salt) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, material, 256);
  return { hash: bytesToBase64(new Uint8Array(bits)), salt: bytesToBase64(saltBytes), iterations };
}

export async function verifyPassword(password: string, expected: string, salt: string, iterations: number) {
  const candidate = await hashPassword(password, salt, iterations);
  const a = encoder.encode(candidate.hash);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let different = 0;
  for (let index = 0; index < a.length; index += 1) different |= a[index] ^ b[index];
  return different === 0;
}

export const randomToken = (size = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const parseCookies = (header: string | null) => Object.fromEntries(
  (header ?? "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }),
);

export const sessionCookie = (token: string, maxAge = 60 * 60 * 24 * 7) =>
  `tpom_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const roomCookie = (token: string, maxAge = 60 * 60 * 24 * 2) =>
  `tpom_room=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function bootstrapOwner(env: Env) {
  if (!env.ADMIN_BOOTSTRAP_EMAIL || !env.ADMIN_BOOTSTRAP_PASSWORD) return;
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(env.ADMIN_BOOTSTRAP_EMAIL).first<{ id: string }>();
  if (existing) return;
  const now = Date.now();
  const userId = crypto.randomUUID();
  const password = await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id,email,display_name,role,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind(userId, env.ADMIN_BOOTSTRAP_EMAIL, "Gabriel", "OWNER", now, now),
    env.DB.prepare("INSERT INTO user_credentials (user_id,password_hash,password_salt,iterations,changed_at) VALUES (?,?,?,?,?)").bind(userId, password.hash, password.salt, password.iterations, now),
    env.DB.prepare("INSERT INTO licenses (id,user_id,kind,created_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(), userId, "UNLIMITED", now),
  ]);
}

export interface AdminSession { id: string; email: string; display_name: string; role: "OWNER" | "ADMIN" }

export async function getAdminSession(c: Context<{ Bindings: Env }>): Promise<AdminSession | null> {
  const token = parseCookies(c.req.header("Cookie") ?? null).tpom_admin;
  if (!token) return null;
  const hash = await sha256(token);
  const row = await c.env.DB.prepare(`SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(hash, Date.now()).first<AdminSession>();
  return row ?? null;
}
