export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  GAME_ROOMS: DurableObjectNamespace;
  APP_ORIGIN: string;
  PAYMENTS_MODE: "mock" | "stripe";
  CONTACT_EMAIL: string;
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  SESSION_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}
