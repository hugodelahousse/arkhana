---
description: Enforce dark fantasy aesthetic for Arkhana UI work. Use when building or reviewing any visual component.
---

<dark_fantasy_tarot_ui>
Dark fantasy UI earns atmosphere through restraint, not decoration. Every visual decision should feel like it belongs to the world of the cards.

Never use:
- Tailwind purple/blue defaults (#6366f1, #3b82f6) — use the existing `--color-rarity-*` tokens instead
- Pure black backgrounds — use `--color-bg-base` (#0a0a0f) which has depth for shadows to read against
- Equal-weight layouts where every element has the same visual mass
- Immediate reveals — suspense is the product; never skip straight to the result
- Generic box shadows — use rarity-colored glows: `box-shadow: 0 0 20px var(--color-rarity-X)`
- `transition: all` — only animate `transform` and `opacity` (GPU composited only)
- Animating while in SSR — gate mouse handlers behind a `mounted` state (set in `useEffect`)
- Comments explaining what a CSS property does — only comment when the easing curve or value is non-obvious

Palette principle: 70% dark base (#0a0a0f / #13131a), 20% surface/elevated, 10% accent via rarity colors or gold. One rarity color owns a card's visual identity — never mix rarity colors on the same element.

Layout: Visual hierarchy through opacity (muted text at 0.4–0.5), not size. Single column, centered, generous vertical spacing. The card is always the visual hero — nothing should compete with it.

Typography: Cormorant Garamond (`var(--font-serif)`) for all card content, evocative copy, and headings. Uppercase + `tracking-widest` for metadata labels. Never override the serif with sans for flavor text.

Animation: Layered timing, not simultaneous. Glow first (100ms), lift (300ms), flip (800ms spring), content fade (after flip completes). Use `motion` `useSpring` (stiffness: 300, damping: 30) for tilt; `ease-out` for entrances; `linear` for infinite shimmer. Only animate when the user has taken an action.

Foil: `mix-blend-mode: color-dodge` on a `conic-gradient` overlay positioned via CSS custom properties `--ratio-x` / `--ratio-y` (0–1, set from `mousemove`). Opacity 0 at rest; scales with rarity tier: 0 / 0.3 / 0.4 / 0.5 / 0.7. Primordial tier animates at idle.

Rarity should feel earned: each tier adds visual intensity (glow strength, foil opacity, animation presence) — not just a color swap.
</dark_fantasy_tarot_ui>
