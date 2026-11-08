# Lab: Major Arcana deck builder

Status: lab experiment at `/lab/deck`. It's gated by `LAB_DECK_ENABLED` and has no accounts.
Decisions come from the 2026-11-06 design grilling. Test results that informed them are noted inline.

## Goal
Users create their own 22-card Major Arcana. They start from a theme or a cast of characters (e.g. a D&D campaign).
An agent turns their instructions into prompts. OpenAI image models generate the art. The user brings their own key.

## Output contract
- The card is 1024×1536 (2:3). The art **window** is fixed: x=64, y=96, 896×1216.
- Art is generated at **exactly the window size (896×1216)**, not full-bleed.
  - Tested: the model ignores "safe zone" instructions and puts subjects under the title band.
- **Frames** are composited overlays (SVG). There is one default frame per style preset, and any frame works with any style.
  - Frames may overlap the window edge by about 32px.
- The **title and numeral are live text** set in each frame's typography.
  - Card names are renamable. The numeral and card id (0–21) are fixed.
- Use: in-app art plus shareable downloads. Print is out of scope.

## Key and cost
- **BYOK.** The key is kept in browser localStorage and sent per request in the `x-openai-key` header.
  - The server holds it in memory for that request or job only. It is never persisted or logged.
- "Sign in with ChatGPT" is not usable. It's for open-source/local apps only, and image generation isn't documented for it.
- **Preflight:** list models and check `gpt-image-2.6-*` access. Organization Verification and zero credit are real failure modes.
- **Ledger:**
  - Every OpenAI call records its actual `usage` and cost, next to the pre-call estimate.
  - Each deck has a **hard budget** enforced on the server (default $10).
  - Actions estimated above **$1** need an explicit confirm.
  - Estimates self-calibrate from the max observed output tokens per (model, quality, size).
- Measured costs at 896×1216:
  - `low`: 626 output tokens, about $0.021.
  - `medium`: 1103 output tokens, about $0.035.
  - Each reference image adds about 1,000 input tokens, about $0.008.

## Models
- Images:
  - `gpt-image-2.6-flare` for probes, drafts and plates.
  - `gpt-image-2.6-sunburst` for finals.
  - Both are called through the Images API (`openai` SDK).
  - The Images API does not rewrite prompts (`revised_prompt` is null).
- Agent: `gpt-6.1-sol` via AI SDK v7 `ToolLoopAgent`.
  - The agent writes, critiques and asks questions. It **never** has a spend tool.

## Pipeline
1. **Chat → direction.** The agent turns the user's theme or cast into:
   - deck settings
   - a Style Bible
   - Cast members
   - 22 card briefs

   It **asks about thin entries** instead of inventing.
2. **Wizard** (the user can return to chat at any time): Style → Cast → Cards → Drafts → Finals.
3. **Style anchor.**
   - An unmodified preset uses its shipped anchor image.
   - Custom styles and user style references go through a probe: 4 variants at `low`, then pick one.
4. **Cast plates.**
   - User character references are *never* sent to card calls.
   - Each reference is turned once into an in-style **character plate** (anchor + reference), which the user approves.
   - Tested: raw references cause art-direction bleed even with an anchor; plates don't.
5. **Drafts.**
   - Each draft is a `low` call with references: anchor plus the plates of the cast on that card.
   - An automatic vision critique checks: does the card read as its meaning, no text, style adherence.
6. **Finals.**
   - Each final is a `sunburst` call with references: anchor, plates, and the **approved draft as a composition reference**.
   - Calibrate on one card before the batch.

## Prompt structure
REFERENCES (numbered roles) → MEDIUM (one line) → SUBJECT → CHARACTERS (full cast descriptions for everyone on the card) → COMPOSITION → PROCESS → PALETTE → EXCLUDE.
- Character descriptions are always included. The likeness comes from text plus any approved sheet.
- The style anchor asks only for a match on medium, line quality, paper and palette, not on detail or composition.
- Style should not outweigh the people on the card.

## Prompt rules (what removed the "AI slop" look in tests)
- Describe a **physical artefact**, not a style. Example: "A flat scan of a hand-printed two-colour linocut on kozo paper…"
- Describe the **process and its imperfections**: gouge marks, misregistration, lead cames, stencil overshoot.
- **Cap the palette** with named pigments, plus hex values where useful.
- **Allocate detail**: say where detail goes. Use "few large shapes" elsewhere, ask for a non-mirror-symmetric composition, and leave large areas empty.
- Always include an **exclusions** line: no text or numerals, no border, no glow or bloom, no airbrushed gradients, no 3D, no digital-painting look.
- Never use mood or booster words ("epic", "dramatic", "meticulous", "masterpiece") or artist names. Rewrite "like X" into a process description.
- **Briefs are written in the style's terms.**
  - Colours or effects the medium can't show are translated, and a fidelity note tells the user what was lost.
  - In a silhouette deck, the dog is identified by its outline, not its colour. Glow becomes carved rays.
- **Meaning first, iconography optional.**
  - Each brief carries the card's meaning.
  - Classic symbols are a menu, used only when they arise naturally from the character's world.
  - At most one or two symbols, never as an inset.
- Number reference images and give each a role. For example:
  - "Image 1 is the STYLE ANCHOR… do not copy its subject or composition."
  - "Image 2 is the CHARACTER SHEET for X…"
- Any text in a character description ("runes", "written signs") becomes abstract marks. The frame owns all lettering.

## Style presets
Two-tone linocut, Stained glass, Illuminated manuscript, Marseille stencil woodcut, Pen & flat colour 1909, Gold line on black, Screenprint silhouette, Game key art.

**Technique-only anchors.** A preset can set `anchorUse: "technique"`: card prompts then take only the anchor's drawing technique (line, shading, texture), never its colours or lighting. Game key art needs it: its lamplit anchor otherwise tinted every card orange. A preset can also replace the default COLOUR EMPHASIS line (`colourLine`); Game key art asks for one named light source and depth instead.

Rejected after tests: generic gilded woodcut, etching, baroque oil, art nouveau, ink & wash, ukiyo-e, risograph, collage; later also golden-age book plate, hand-coloured woodcut, Renaissance gold leaf, mid-century gouache. Shorter briefs (one subject, a named light source and viewpoint, no prop lists) helped every style.

## Preview page

The preview loads `GET /decks/:id/preview`, a slim payload (card names and texts, and per card only the accepted final, approved draft, newest final and newest draft, plus the back; "Latest" shows whichever of the newest final and newest draft is more recent, so a restyle's drafts replace older finals) instead of the full deck state with its prompts, chat and ledger. Card art is drawn as an HTML `<img decoding="async">` under the SVG frame (`htmlArt` on `CardFrame`/`CardBack`), so the browser loads and decodes it off the main thread; the thumbnail strip is lazy and low priority. Image exports keep the art inside the SVG, since they serialize it on its own.

## Exports (preview page)

The preview page's **Download** menu works on the art currently shown (Latest or Approved only). Everything renders in the browser, so the frames' live titles use the same fonts as on screen.

- **Art**: the raw artwork and the selected card back, as JPEGs in a zip.
- **Cards**: each card composited with its frame, numeral and title, as 1024×1536 PNGs (lossless print masters), plus the back.
- **Preview artifact**: a folder with `index.html`, `viewer.js`, `viewer.css` and the cards as JPEGs. It is the same 3D deck viewer, runs offline and opens straight from disk (classic script, deck data inlined in the HTML). The viewer bundle is built by `pnpm build:lab-viewer` (from `app/lab-viewer/main.tsx`, config `vite.lab-viewer.config.ts`) into `public/lab-deck/viewer/` (gitignored); `pnpm build` runs it first. In dev, run it once yourself.
- **Print**: cards at 80 × 120 mm, four per A4 or Letter page. With backs on, each fronts page is followed by its backs page with columns swapped, so the backs line up when printed double-sided and flipped on the long edge. Print at 100% scale.

## Access, bundles and production

**Access.** Anyone with a deck's link can view it: the deck state, its images and the preview page. Creating, importing and every change need a signed-in (non-anonymous) account, and changes are limited to the deck's owner (`lab_decks.owner_id`). Decks made before ownership existed have no owner; the first signed-in account to edit one claims it. The workspace shows a view-only screen to everyone else.

**Bundles.** The workspace's **Export** button downloads the whole deck as a zip: `deck.json` (deck, cards, cast, images, ledger) plus every image file. **Import a deck** on `/lab/deck` loads one; the importer becomes the owner and the deck keeps its id, so its links work unchanged on the new host. Use this to move a deck between environments.

**Production (Dokku).** Images are files under `LAB_DECK_DATA_DIR` (default `.data/lab-deck`, so `/app/.data/lab-deck` in the container), which a deploy wipes unless it's on persistent storage. One-time setup on the Dokku host:

```sh
dokku storage:ensure-directory arkhana-lab-deck
dokku storage:mount arkhana /var/lib/dokku/data/storage/arkhana-lab-deck:/app/.data/lab-deck
dokku nginx:set arkhana client-max-body-size 200m   # deck bundles are ~60 MB
dokku proxy:build-config arkhana
dokku config:set arkhana LAB_DECK_ENABLED=true      # restarts the app with the mount
```

## Deferred
- Accounts, sharing links, R2 storage, zip export, generated frames.
- Print, durable job queue (pg-boss), Sign in with ChatGPT.
