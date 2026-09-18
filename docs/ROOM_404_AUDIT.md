# ROOM 404 — investigation revision

## Baseline audit (the code, before edits)

All eight playable scenes, plus entry, paywall and ending, were inspected. This is a design review, not a human playtest. Answers below are spoilers and are never imported by the client.

| Scene | ARCHIVE received | FIELD received | Old solution / actual reasoning | Problem |
|---|---|---|---|---|
| Four Cards | Moon 3, key 7, bell 1, eye 9, already ordered | Complete order in three sentences | 3719; read left to right | ARCHIVE could solve alone; FIELD's ordering document was redundant. Unique but no discovery. |
| Voicemail | Count tones after each chime | Audio encoding 3042 | Count four groups | Complementary but mechanical; no transcript, pause or evidence archive. |
| Impossible Alibi | Named, chronological badge log | Owen says he left at 23:40 | Owen, because later logs name him | Technically cross-role, but one direct lookup; badge identity conflated with owner. |
| Paranoia | “Do not disclose digit 6” | Ask the partner for the number | 6 | Fake secrecy with no verification or inference. |
| Trace Her Path | Fully ordered named timeline | Camera-to-location dictionary | C1,C3,C4,C2 | Pure substitution; one player reads instructions to the other. |
| The Call | ANSWER | DO NOT ANSWER | Either accepted | No evidence distinguishes decisions; choice does not affect investigation. |
| Maintenance Passage | April 17, MMDD | Entire escape route spelled out | 417 | Contradictory format: MMDD implies 0417; client accepts three digits. ARCHIVE solves alone. |
| Final Deduction | Select suspect already identified | Select route already spelled out | Owen / passage | No proof required; no access to past documents; mostly recall or guessing. |

No intended old code required advanced knowledge; the main problems were direct disclosure and shallow logic, not impossibility (except the maintenance format). The lobby, purchase checkpoint and Maya-safe ending work as connective scenes and remain. There were no additional playable stages hidden in the engine.

## Revised reasoning and single-solution review

| Stage | ARCHIVE knowledge | FIELD knowledge | Deduction and reveal |
|---|---|---|---|
| 1 | Loose digits, moon-key adjacency; eye back excludes eye/moon adjacency | Bell-eye adjacency, left-to-right reading | Treat pairs as blocks. Bell-eye-moon-key violates the reverse annotation. Only moon-key-bell-eye remains. Revised digits give **2758**. Both private clue sets independently permit multiple orders. |
| 2 | Four recorder clock corrections, chronological assembly rule | Four identified fragments with timestamps and pulse transcripts | K 00:08−4=00:04; R 00:04+2=00:06; M 00:08; T 00:11−1=00:10. Counts become **2031**. Equal displayed times are the apparent contradiction. Silence is explicitly intact, not a missing clip. |
| 3 | Certified backup shows Maya entering at 00:04 after her reported disappearance | Surviving frame reports a second entry at 00:06 | Both phones receive a discovery at the existing purchase boundary. The full case investigates falsified chronology and concealed footage. |
| 4 | Raw badge records; readers twenty minutes fast | Hotel-time statements, badge ownership and documented loan | P at 23:58 is actually 23:38, after Owen's claimed 23:30 departure; custody rules out lending. Naomi's apparent contradiction is explained by Eli's loan. Adrian and Eli agree with the corrected log. **Owen** is uniquely contradicted. |
| 5 | Three packet headers, each with seal/counters | Authenticity requires closed seal AND +1 counter | 2 fails seal, 8 fails counter, **4** passes both. A warning's claim to authority is no longer itself evidence. |
| 6 | Location-specific clock offsets | Camera IDs, locations, displayed frame times | Corrected times give **C3,C1,C2,C4** (00:04, 00:11, 00:14, 00:17). Neither display order nor numeric camera order works. The guest exit has no crossing. |
| 7 | Actual challenge 31, response 30, green relay | Green relay plus response=challenge+1 | Green alone is insufficient. **Decline** the impostor. Incorrect authentication can be retried; no timed trap. Transcript remains available. |
| 8 | Three work orders with intersecting hardware features | Brass latch and split-circle seal; fibres, duct, sealed windows and locked lift | Only order **417** matches both features. Number is explicitly three digits. Optional note explains the self-closing latch and Naomi's backup; not required to finish. |
| 9 | Timestamped erase/export/read transactions | Personal biometric token custody | **Owen + TX-17**, not mere presence, proves deletion. FIELD must combine inspected panel with ARCHIVE's work orders: **maintenance passage + 417**. EXPORT establishes Naomi as preserver. Maya's safety and Owen's erasure remain the twist. |

There are no random clues, changing answers, artificial waits, destructive penalties or external-knowledge requirements. Shuffling is a stable initial arrangement, followed by player-controlled persistent ordering. The optional evidence never gates the ending. The call is now an authentication puzzle rather than a cosmetically branching choice. Other scenes retain their basic narrative purpose.

## Interaction and accessibility

Cards support HTML drag/drop, two-tap swaps and named left/right controls; touch and keyboard users do not depend on drag/drop. Backs reveal meaningful evidence. Documents are selectable, scrollable and marked examined. Photographs support zoom and scroll/pan. CCTV uses inspectable frame tabs and a persistent, removable route. Audio fragments provide play, pause/replay, waveform and full textual equivalents, including silence. No sound is essential.

Previous private files can be reopened through EVIDENCE, including at the paywall and after completion. One bilingual hint per puzzle lives in the server puzzle schema. Requesting it persists per player; repeated requests show the same hint. An explicit analysis notification sends a real engine event to the partner, without exposing the document or solution. File-opening animation respects reduced-motion preferences.

Photos reuse the existing illustrative assets with text inspection reports; there are no newly photographed literal CCTV frames. Evidence text and readable controls, not tiny visual marks, carry the required information.

## Verification and honest limits

Unit tests enumerate all card orders, verify each role remains ambiguous, reconstruct calibrated recordings and CCTV, check authentic packet/hardware matches, enumerate final claim/proof combinations, check earned-role visibility, localization and non-answer hints. Existing authentication and case-schema tests remain.

Playwright uses independent mobile-sized browser contexts against the actual local Worker, Durable Object and D1. Known-solution runs verify the full case with and without optional evidence, both players' progress, rejection/retry, hint privacy, restored cards and routes, restored final drafts, old evidence access, the purchase gate and local OWNER entitlement. These are technical regressions, not human difficulty measurements. Local checkout uses the existing `PAYMENTS_MODE=mock`; no live Stripe transaction or production deployment is claimed.

Manual reasoning review is the table above, using the delivered evidence. The author also knows the implementation and cannot claim a blind playtest. No human playtest was available. The 3–5 / 4–7 / 5–8 minute targets and 25–40 minute total remain hypotheses to measure with unfamiliar duos, especially the shorter packet-authentication and call scenes. No fabricated completion times or satisfaction scores are reported.

Executed locally: 16 unit tests passed; all 12 Playwright tests passed together with retries disabled, including the configured local OWNER test; TypeScript/production build and ESLint passed. Browser testing found and fixed a footer blocking the analysis control and a card-reordering operation that omitted the moved card (the server correctly rejected that incomplete permutation). The language-persistence harness was also corrected so it no longer overwrites the saved locale at every navigation. Captures are generated under the ignored `test-results/` directory.

Recommended human session: two unfamiliar players, separate screens, no solution sheet; record unprompted deductions, requests for hints, dead ends and stage times. Verify whether clock correction in both voicemail and CCTV feels repetitive, and whether final cross-reference is sufficiently distinct from the alibi.
