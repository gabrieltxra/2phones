# Cloudflare deployment

Resources:

- Worker: `two-phones-mystery`
- D1: `two-phones-mystery-db` bound as `DB`
- R2: `make-them-the-game-media` bound as `MEDIA`
- Durable Object: `GameRoom` bound as `GAME_ROOMS`

Create missing resources:

```bash
npx wrangler d1 create two-phones-mystery-db
npx wrangler r2 bucket create make-them-the-game-media
```

Copy the returned D1 ID into `wrangler.jsonc`, apply migrations locally and remotely, set production secrets, then deploy:

```bash
npx wrangler d1 migrations apply two-phones-mystery-db --local
npx wrangler d1 migrations apply two-phones-mystery-db --remote
npm run deploy
```

Production must keep `PAYMENTS_MODE=stripe`. Required production secrets are `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. If Stripe secrets are absent, checkout and webhook routes fail closed.

After deployment, verify `/api/health`, landing assets, one two-browser room, reconnect after refresh, owner login, R2 upload/list/delete, payment webhook idempotency, and mobile widths 390 and 430px.
