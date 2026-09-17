# Two Phones, One Mystery

A mobile-first, two-player cooperative mystery built on Cloudflare Workers. Each player receives private role-specific evidence, while a Durable Object owns the authoritative room state and broadcasts changes over hibernatable WebSockets.

## Architecture

- React + TypeScript + Vite for the installable PWA.
- Hono Worker for API, authentication, analytics, media, and Stripe orchestration.
- one `GameRoom` Durable Object per room code for authoritative multiplayer state.
- D1 for users, sessions, licenses, rooms, purchases, entitlements, events, analytics, and audit logs.
- private R2 bucket for admin-uploaded evidence.
- data-defined case schema in `shared/game.ts`; correct answers remain Worker-only.
- centralized `en-US` and `pt-BR` catalog in `src/i18n/index.tsx`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/CASE_ENGINE.md](docs/CASE_ENGINE.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Local development

Requirements: Node.js 22+, npm, and a Cloudflare account for remote resources.

```bash
npm install
copy .dev.vars.example .dev.vars
npm run audio:generate
npm run dev
```

Set `PAYMENTS_MODE=mock` only in `.dev.vars` or a test environment. Never set mock mode in production.

## Database

```bash
npx wrangler d1 migrations apply two-phones-mystery-db --local
npx wrangler d1 migrations apply two-phones-mystery-db --remote
```

Migrations are versioned in `migrations/`; tables are never created at runtime. Owner bootstrap is idempotent and runs during an admin login attempt only when the owner does not exist.

## Required secrets

```bash
npx wrangler secret put ADMIN_BOOTSTRAP_EMAIL
npx wrangler secret put ADMIN_BOOTSTRAP_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

The bootstrap password is hashed with PBKDF2-SHA256 and a unique random salt before D1 storage. Plaintext credentials are not stored in the repository or migrations. Stripe remains fail-closed if its secrets are absent.

## Stripe

Create a webhook for `https://<worker>/api/payments/webhook` and subscribe to `checkout.session.completed`. The webhook signature is verified and is the authority for entitlement creation; returning to the success URL never unlocks a room on its own.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Deploy

Cloudflare resources and commands are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Run `npm run deploy` after migrations and secrets are ready.
