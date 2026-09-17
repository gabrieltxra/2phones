# Case engine

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
