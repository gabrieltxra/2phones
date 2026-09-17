# ROOM 404 art direction

The visual language is an investigative thriller in a contemporary boutique hotel after midnight: cold fluorescent spill, deep but plausible shadows, dark walnut, desaturated olive, graphite, small warm practical lights, subtle grain, and evidence-first framing. Text, timestamps, camera IDs, and room numbers are added in HTML so they remain perfectly legible and localizable.

All ten raster assets were generated once during development with the built-in ImageGen tool, then resized and compressed into WebP plus 420px thumbnails. No production request invokes AI.

## Characters

- `maya-reed.webp`: Maya Reed, 29, independent journalist; shoulder-length wavy dark-brown hair, hazel eyes, olive complexion, charcoal overshirt and cream T-shirt; observant, tired, credible.
- `adrian-vale.webp`: Adrian Vale, early 40s, night manager; medium-brown skin, short black hair graying at the temples, dark rectangular glasses, charcoal suit and muted olive tie; calm and guarded.
- `owen-pike.webp`: Owen Pike, late 30s, security contractor; fair weathered skin, short sandy-brown hair, light stubble, navy work jacket and gray henley; capable and ordinary, never villain-coded.
- `naomi-brooks.webp`: Naomi Brooks, early 30s, hotel guest; medium-dark skin, short natural coils, rust knit sweater and dark coat; composed and guarded.
- `eli-reed.webp`: Eli Reed, early 30s, Maya's brother; hazel eyes, dark wavy hair, olive complexion, faded dark-green field jacket and navy T-shirt; worried but restrained.

## Environment files

- `room-404-door.webp`: centered vertical hotel-door evidence image, no embedded number.
- `cctv-fourth-floor.webp`: high corner camera view with a distant unidentifiable figure.
- `cctv-service-corridor.webp`: matching service corridor with maintenance cart.
- `maya-hotel-room.webp`: intact hotel room with cracked phone, card, and closed laptop.
- `maintenance-passage.webp`: concealed wall access leading toward a service stairwell.

## Prompt base

Use case: photorealistic-natural. Asset type: believable evidence photograph for an investigative thriller. Scene: contemporary 2026 boutique hotel, dark walnut, muted olive, charcoal, cold fluorescent lighting and small warm practicals. Style: surveillance-noir realism, documentary restraint, subtle grain, low saturation. Constraints: no readable in-image text, numbers, logos, watermark, blood, graphic violence, supernatural elements, cyberpunk, neon, extreme theatrical light, malformed anatomy, or glossy AI aesthetic. Preserve the character descriptions above verbatim for future appearances.

Specific environment prompts add the framing and subjects documented in the Environment files section; specific portrait prompts add vertical 4:5 head-and-shoulders framing, realistic skin, neutral expressions, and a softly defocused setting. Generated originals remain in the Codex image output directory; optimized final files are under `public/evidence/`.

## Audio

`scripts/generate-audio.mjs` creates eight original 44.1 kHz PCM WAV files: `rec-001`, room ambience, connection established, evidence unlocked, incoming message, simulated call, call connection, encrypted packet, and case solved. `REC_001` is exactly chime/3 knocks, chime/silence, chime/4 knocks, chime/2 knocks. No copyrighted samples or production TTS are used.
