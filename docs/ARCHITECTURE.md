# Architecture

## Request topology

The Cloudflare Worker serves the Vite SPA and owns `/api/*` and `/media/*`. Hono validates inputs and delegates room operations to `GAME_ROOMS.getByName(roomCode)`. That stable name guarantees every request for a room reaches the same Durable Object.

`GameRoom` persists its complete authoritative snapshot in Durable Object storage. Browser messages never decide puzzle correctness, role visibility, entitlement, or transitions. The Durable Object validates actions and projects a player-specific public state. WebSockets use `acceptWebSocket`, serialized player attachments, and automatic ping/pong so rooms can hibernate without disconnecting players.

D1 stores durable business records and an append-only event trail. The Durable Object updates the room summary after each meaningful event. A room can be reconstructed from its stored snapshot and audited from D1 events.

## Security boundaries

- Guest identity is an opaque random room token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only a SHA-256 digest is stored.
- Admin sessions use independent random tokens, stored only as hashes, and expire after seven days.
- Passwords use PBKDF2-SHA256 with per-user salt and 120,000 iterations.
- D1 calls use bound prepared statements.
- Content Security Policy, anti-framing, MIME sniffing, and referrer controls are sent on every response.
- R2 is private. Reads and writes pass through authenticated Worker routes; uploads have MIME and size allowlists.
- Case solutions are defined only in Worker code and never returned by APIs or bundled with React.
- Stripe entitlements are created only after a verified, idempotent webhook.

## Internationalization

The UI has one `I18nProvider` and one typed catalog for `en-US` and `pt-BR`. The first visit follows the browser language; the explicit selection is stored in `localStorage`, updates the document language immediately, and applies to landing, game, paywall, results, legal pages, and admin. Content saved in room state is semantic (stages, events, choice IDs), so players may use different display languages without desynchronizing the game.

## Data retention

The schema supports later scheduled cleanup of abandoned rooms, room events, guest identities, and expired sessions. No conversational audio or chat content is collected.
