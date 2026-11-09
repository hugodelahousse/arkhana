// Style presets for the lab deck builder. Each one is a Style Bible written as
// a physical artefact + process (see docs/lab-deck-builder.md "Prompt rules").
// The wording here was tested on gpt-image-2.6-flare; edit with care.
import type { LabStyleBible } from "../../../db/schema/lab-deck";

export type StylePreset = {
  id: string;
  name: string;
  blurb: string;
  frameId: FrameId;
  bible: LabStyleBible;
  /** Shipped anchor image: a generated style sample in this style. */
  anchorUrl: string;
  /** What the anchor depicts, so card prompts can say not to copy it. Defaults to {@link DEFAULT_ANCHOR_SUBJECT}. */
  anchorSubject?: string;
  /**
   * "technique": card prompts take only the anchor's drawing technique, never its colours or
   * lighting. For anchors with a strong colour cast (a lamplit scene) that would tint every card.
   */
  anchorUse?: "technique";
  /** Replaces the default COLOUR EMPHASIS line of card prompts. */
  colourLine?: string;
};

export const FRAME_IDS = [
  "carved-block",
  "leaded-glass",
  "vellum-margin",
  "marseille-banners",
  "white-border-1909",
  "foil-rule",
  "ink-band",
] as const;
export type FrameId = (typeof FRAME_IDS)[number];

const BASE_EXCLUDE =
  "no text, letters, runes or numerals; no border or frame; no signature or watermark; no glow, bloom or lens blur; no airbrushed gradients; no 3D rendering; no digital-painting look; no texture overlay faked on top of a smooth image.";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "linocut-2c",
    name: "Two-tone linocut",
    blurb: "Carved black and one red ink on kozo paper",
    frameId: "carved-block",
    anchorUrl: "/lab-deck/anchors/linocut-2c.jpg",
    bible: {
      artefact:
        "A flat scan of a hand-printed two-colour linocut, printed on warm off-white Japanese kozo paper.",
      process:
        "Every shape is simplified to what a gouge can cut. Bold outlines left standing by a wide U-gouge; tone made only with parallel V-gouge cuts that follow the form. Black solids slightly mottled where the brayer under-inked; the red block printed about 1 mm out of register with the black. Whites are clean, uncut paper. Anything magical or luminous is shown as carved radiating cut-lines and red ink, never as glow.",
      palette:
        "Two inks only: carbon black and iron-oxide red (#9A3B2A); the bare paper is the third colour. Red is used sparingly, for one or two accents.",
      exclude: `no other colours, no halftone, no hatching finer than a gouge can cut, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "stained-glass",
    name: "Stained glass",
    blurb: "Leaded panes with painted grisaille, lit from behind",
    frameId: "leaded-glass",
    anchorUrl: "/lab-deck/anchors/stained-glass.jpg",
    bible: {
      artefact:
        "A photograph, taken straight-on, of a medieval-style leaded stained-glass panel lit from behind by daylight.",
      process:
        "Pieces of hand-blown coloured glass held in dark lead cames of even width, soldered at the joints; two thin horizontal iron support bars cross the panel. Faces, hands, fur and small details are painted on the glass in grey-black grisaille with fine lines and a few stippled washes; yellows are silver stain. Each piece varies slightly in colour and has small seeds (bubbles) and streaks. Pieces are large; one glass colour per piece.",
      palette:
        "Cobalt blue, ruby red, emerald green, amber/golden yellow, and pale clear glass.",
      exclude: `no smooth painted gradients across pieces, no light rays or lens flare, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "illuminated",
    name: "Illuminated manuscript",
    blurb: "Egg tempera and burnished gold on vellum",
    frameId: "vellum-margin",
    anchorUrl: "/lab-deck/anchors/illuminated.jpg",
    bible: {
      artefact: "A flat museum photograph of a 15th-century illuminated manuscript miniature on calfskin vellum.",
      process:
        "Fine dark-brown ink underdrawing; egg tempera laid in flat areas with only two or three tonal steps per colour and fine white highlight hatching on drapery, fur and stone; holy, celestial or magical elements in raised, burnished gold leaf; skies are a flat patterned ground (a diamond lattice in blue and gold). Shallow stage-like space with a flattened, tilted ground plane. Slight paint loss and wear at the edges, warm vellum tone showing where paint is thin.",
      palette: "Ultramarine, vermilion, malachite green, lead white, burnished gold, vellum.",
      exclude: `no deep perspective, no atmospheric haze, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "marseille",
    name: "Marseille stencil woodcut",
    blurb: "18th-century woodcut, colour brushed through stencils",
    frameId: "marseille-banners",
    anchorUrl: "/lab-deck/anchors/marseille.jpg",
    bible: {
      artefact: "A flat scan of an 18th-century French woodcut playing card, coloured by hand through stencils (pochoir).",
      process:
        "Thick, slightly wobbly black woodcut outlines; a few short parallel hatch strokes in black for shadow, nothing finer. The black key block is printed from worn wood: lines vary in thickness, with small breaks, ink-starved patches and occasional specks. Colour applied through cut stencils as flat, even fills with no brush marks or gradients, but hand-made: each colour sits a few millimetres off the outlines, overshooting or falling short, with slightly ragged stencil edges and the occasional small gap where paper shows through. The laid paper is aged to a warm cream with faint chain lines, light foxing and uneven tone, and is left bare in large areas. Naive, emblematic drawing: frontal shapes, almost no background depth.",
      palette: "Only five flat colours: vermilion red, sun yellow, sky blue, pale flesh, leaf green.",
      exclude: `no shading, gradients or brush texture inside colour areas, no colours outside the five, no fine detail, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "pen-1909",
    name: "Pen & flat colour, 1909",
    blurb: "Ink line with flat watercolour, early lithographic print",
    frameId: "white-border-1909",
    anchorUrl: "/lab-deck/anchors/pen-1909.jpg",
    anchorSubject: "a cobbler at work in his lamplit workshop, not a tarot card",
    bible: {
      artefact:
        "A flat scan of an early-1900s book illustration: black pen-and-ink line drawing coloured with flat opaque watercolour, reproduced by colour lithography.",
      process:
        "Uniform, confident black contour lines of one weight; colour laid in flat, slightly uneven washes that stop at the lines, with almost no modelling; simple stage-like composition. Slight lithographic grain; the warm cream of the paper shows faintly through the colour.",
      palette:
        "Colour direction: the warm, earthy-bright colour of early-1900s printed tarot. The time of day comes from the scene, never from habit: soft clear blue skies by day; warm cream, peach or dusk-rose at dawn and dusk; at night, a deep flat indigo or night-blue sky with the whole scene in cooler, darker versions of its colours (still clearly coloured, never black or grey), and golden yellow only as an occasional accent sky rather than a default backdrop; landscapes in sage and olive greens and warm stone greys; accents in brick red, golden yellow and clear soft blue. Colours are clear and flat but softened by the cream paper: never neon, never greyed or dusty. Characters, costumes and objects keep the colours they are described with (a violet cloak stays violet, blue hair stays blue); this direction applies to settings, backgrounds and anything left unspecified.",
      exclude: `no cross-hatching, no rendered lighting, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "gold-on-black",
    name: "Gold line on black",
    blurb: "Single-weight foil line on matte black stock",
    frameId: "foil-rule",
    anchorUrl: "/lab-deck/anchors/gold-on-black.jpg",
    bible: {
      artefact: "A photograph of a card printed in gold foil on matte black stock.",
      process:
        "The entire image is a single-weight metallic gold line drawing on flat matte black: outlines only, no fills, no shading, no tone; minimal and elegant, with large areas of empty black. The foil catches light very slightly unevenly and has tiny breaks where the stamp did not fully transfer.",
      palette: "Gold foil and matte black only.",
      exclude: `no colours other than gold and black, no filled shapes, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "screenprint",
    name: "Screenprint silhouette",
    blurb: "Matte black silhouettes over one flat ink field",
    frameId: "ink-band",
    anchorUrl: "/lab-deck/anchors/screenprint.jpg",
    bible: {
      artefact: "A flat scan of a two-colour hand-pulled screenprint on smooth cream paper.",
      process:
        "All figures, objects and landforms are solid matte black silhouettes with no interior detail except a few cut-away negative shapes (eyes, windows, a profile). Characters are identified by outline alone: hair, ears, clothing edges, held objects. Printed over one flat field of colour ink that covers the sky or background only; the ground meets bare cream paper. Crisp shapes with very slight ink build-up at the edges and a few tiny pinholes in the solids. No layering, no shadows: just ink on paper.",
      palette: "Matte black, one flat colour field (deep teal by default), cream paper.",
      exclude: `no colour inside the silhouettes, no gradients, no paper texture layers, ${BASE_EXCLUDE}`,
    },
  },
  {
    id: "game-key-art",
    name: "Game key art",
    blurb: "Flat graphic poster: bold outlines, flat colour shapes",
    frameId: "foil-rule",
    anchorUrl: "/lab-deck/anchors/game-key-art-poster.jpg",
    anchorSubject: "a cobbler at work in his lamplit workshop, not a tarot card",
    anchorUse: "technique",
    colourLine:
      "LIGHT & DEPTH: one clear light source shapes the figures and the space; the setting has depth and atmosphere and can carry rich colour; the figures stay the focus through light and contrast, not by dulling the background.",
    bible: {
      artefact:
        "A flat graphic poster illustration in the style of 2D game key art: bold black outlines and flat colour shapes, like a cut-paper or vector poster. The picture fills the whole image edge to edge, cropped inside the painted area: no paper margin, no painted border.",
      process:
        "Everything reduced to big, bold, angular shapes with thick black outlines and no interior lines except the face and hands; flat solid colour fills with one hard-edged shadow shape per area and no gradients or texture; figures stylised and graphic, with elongated limbs, a strong silhouette and a simple, characterful face; a bright rim light in a contrasting colour drawn as a flat stripe along one edge of each figure; the background is two or three flat tonal layers with one glowing shape behind the figure.",
      palette:
        "A limited palette of five or six flat colours per card: deep indigo and violet darks, one saturated glowing accent chosen for the card, and warm mid-tones for skin and cloth.",
      exclude:
        "no text, letters, runes or numerals; no border or frame; no signature or watermark; no 3D rendering; no glossy digital-painting look; no airbrushed gradients; no lens blur; no texture overlay faked on top of a smooth image; no fine detail, no hatching, no brush texture, no gradients, no ornament",
    },
  },
];

export const PRESET_BY_ID: Record<string, StylePreset> = Object.fromEntries(
  STYLE_PRESETS.map((p) => [p.id, p])
);

/** Older shipped anchors are all a generated "The Moon" card. */
export const DEFAULT_ANCHOR_SUBJECT = "The Moon, a tarot card";

export function anchorSubjectFor(presetId: string): string {
  return PRESET_BY_ID[presetId]?.anchorSubject ?? DEFAULT_ANCHOR_SUBJECT;
}

/** True when the deck's style bible is the preset's, untouched. */
export function isPresetUnmodified(presetId: string, bible: LabStyleBible | null): boolean {
  if (!bible) return true;
  const p = PRESET_BY_ID[presetId];
  if (!p) return false;
  return (
    bible.artefact === p.bible.artefact &&
    bible.process === p.bible.process &&
    bible.palette === p.bible.palette &&
    bible.exclude === p.bible.exclude
  );
}

export function effectiveBible(presetId: string, bible: LabStyleBible | null): LabStyleBible {
  return bible ?? PRESET_BY_ID[presetId]?.bible ?? STYLE_PRESETS[0].bible;
}
