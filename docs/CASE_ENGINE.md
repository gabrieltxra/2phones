# Case engine

## Investigation revision (version 2)

New rooms are pinned to `caseVersion: 2` in the Durable Object and `case_version=2` in D1. Apply `0003_investigation_v2.sql` before release. Objects without a version remain on the legacy version 1 flow; their gifts, entitlement, reconnect tokens and in-flight answers are not migrated. Reset clears workbenches but preserves the room version and entitlement. `ROOM_404_PUBLIC` continues to describe the legacy structural graph; v2 keeps that graph and its purchase checkpoint, with puzzle definitions and private content in `worker/cases/room-404-investigation.ts`.

`shared/investigation.ts` defines only transport types and a localization constructor. The Worker-only catalog owns role-bound, stage-bound files, bilingual `puzzleSchema.hint` values, and v2 answer validation. Never import this catalog from React. `evidenceFor` projects only earned files for the authenticated role; websocket broadcasts and HTTP responses use the same projection. Neither a client-supplied role nor an evidence ID grants access. Correct answers stay in Worker validators.

Each player's persisted workbench contains card order, flipped and examined IDs, hint usage, per-stage drafts (route/votes/final proof), and analysis completion. `REORDER` accepts only a full card permutation in stage 1 from ARCHIVE. `EXAMINE` and `FLIP` require an earned private file; `HINT` only reveals the current puzzle's one hint. `DRAFT` stores bounded non-authoritative hypotheses, never progress. `ANALYZE` emits `PARTNER_ANALYZED`; the partner sees only a completion flag, not private working state. Refresh, websocket reconnection and Durable Object restoration use this stored state. Draft numeric text and currently opened file are transient UI state; the actual interactive card/route/proof state is persisted.

The final answer is `[claimId, proofId]`, validated only after both players lock. Failed consensus clears both locks and preserves evidence/drafts for revision. Starting an already-started room is rejected, fixing the old START action's ability to reset progress. The paywall rejects progress mutations; reopening/marking already-earned documents remains possible. The optional repair note is never required for final validation.

Detailed baseline audit, solution reasoning, accessibility and playtest limitations: [ROOM_404_AUDIT.md](ROOM_404_AUDIT.md).

### Local verification

Install with `npm ci`, apply `npx wrangler d1 migrations apply two-phones-mystery-db --local`, and configure an ignored `.dev.vars` with `PAYMENTS_MODE=mock` and `APP_ORIGIN=http://localhost:5199`. This setting is for local checkout regression only. To run the OWNER smoke, use your local bootstrap email/password in `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`, and matching `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` in the test process. With no owner test password the OWNER test is explicitly skipped. Never point these mock-checkout tests at production.

Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e -- --workers=1`. On Windows with a restricted PowerShell execution policy use `npm.cmd` / `npx.cmd`. The existing Playwright config uses installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`; adjust that local executable path on other machines.

Cases are validated data, not React page flows. `shared/game.ts` defines `Case`, `Act`, `Scene`, `Node`, `Puzzle`, `Transition`, and `Ending` schemas with Zod. `ROOM_404_PUBLIC` contains the safe structural definition and role visibility rules. Correct answers and authoritative transition handling live in `worker/game-room.ts` and never enter the public bundle.

## Add a new case

1. Create a public definition that passes `caseSchema`. Give the case a stable ID, slug, version, price, free checkpoint, acts, scenes, role-safe nodes, transitions, and endings.
2. Add localized copy keys for every visible node in both catalogs. Use semantic answer IDs so two players may play in different languages.
3. Add Worker-only solution validation and a deterministic transition table. Treat all browser values as untrusted.
4. Add a D1 migration for the case and immutable version row. Publishing a new version must not mutate rooms already in progress.
5. Render new node types through the generic evidence/action components. Do not place a correct answer in component props, JavaScript assets, or static JSON.
6. Add unit tests for schema validity, role visibility, alternative answers, transition order, and checkpoints; then add a two-context Playwright journey.

## Supported node types

`text_message`, `system_message`, `image_evidence`, `document_evidence`, `audio_evidence`, `video_evidence`, `choice`, `keypad`, `text_code`, `multiple_choice`, `reorder`, `hotspot`, `wait_for_partner`, `simulated_call`, `timed_event`, `shared_reveal`, `role_private_reveal`, and `final_deduction`.

## ROOM 404 stages

0 lobby; 1 Four Cards; 2 Voicemail; 3 paywall; 4 Impossible Alibi; 5 packet-integrity event; 6 Trace Her Path; 7 The Call; 8 Maintenance Passage and optional evidence; 9 final deductions; 10 reconstructed ending.
