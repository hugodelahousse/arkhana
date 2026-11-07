// Image prompt builders for the lab deck builder. Structure:
// REFERENCES → MEDIUM (one line) → SUBJECT → CHARACTERS → COMPOSITION → PROCESS → PALETTE → EXCLUDE.
// The medium line keeps the "physical artefact" framing that avoids the generic
// AI look; the subject and full character descriptions come before the long
// process text so the people on the card carry more weight than the style.
import type { LabStyleBible } from "../../../db/schema/lab-deck";
import { CARD_BY_ID } from "../cards";


export const MAJOR_IDS = Array.from({ length: 22 }, (_, i) => i);

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
export const romanNumeral = (cardId: number) => ROMAN[cardId] ?? String(cardId);
export const traditionalName = (cardId: number) => CARD_BY_ID[cardId]?.name ?? `Trump ${cardId}`;

/**
 * The card's name as it appears in image prompts. Some traditional names trip the image
 * safety filter on their own: "The Hanged Man" next to an upside-down figure is refused as
 * self-harm. Text prompts (agent, revise, rewrite) keep the traditional name.
 */
const IMAGE_SAFE_NAMES: Record<number, string> = { 12: "The Suspended One" };
export const imageSafeCardName = (cardId: number) => IMAGE_SAFE_NAMES[cardId] ?? traditionalName(cardId);

export type RefRole =
  | { kind: "anchor"; presetSubject?: string }
  | { kind: "style-ref" }
  | { kind: "draft" }
  | { kind: "sketch" }
  | { kind: "previous"; change: string };

function refLine(n: number, role: RefRole): string {
  switch (role.kind) {
    case "anchor":
      return `Image ${n} is the STYLE ANCHOR for this deck: match its medium, line quality, paper and palette. Do NOT copy its subject, figures, animals, objects, composition or level of detail${role.presetSubject ? ` (it shows ${role.presetSubject}, only as a style sample)` : ""}, and do not take its sky colour, lighting or time of day: those come from the scene. The scene and the characters come from the text below.`;
    case "style-ref":
      return `Image ${n} is a STYLE REFERENCE: use only its medium, marks, texture and palette. Do NOT copy its subject or composition.`;
    case "previous":
      return `Image ${n} is the PREVIOUS VERSION of this exact image. Change only this: ${role.change.trim()}. Keep everything else the same: composition, poses, placement, framing, palette and medium.`;
    case "sketch":
      return `Image ${n} is a rough LAYOUT SKETCH of this card back: follow its border, overall layout and where the main colours sit. Its emblems are crude vector placeholders: draw them as fully realised, detailed artwork following the description, never copying the sketch's flat shapes. It is not the finished look.`;
    case "draft":
      return `Image ${n} is the APPROVED DRAFT of this exact card: keep its composition, poses, placement and framing, and re-render it at full finish in the deck's style. Do not reproduce its low-resolution softness or artefacts.`;
  }
}

function referencesBlock(roles: RefRole[]): string {
  if (roles.length === 0) return "";
  return `REFERENCES:\n${roles.map((r, i) => refLine(i + 1, r)).join("\n")}\n\n`;
}

function styleBlocks(b: LabStyleBible) {
  return {
    artefact: `MEDIUM: ${b.artefact}`,
    tail: `PROCESS: ${b.process}\nPALETTE: ${b.palette} Colours named in the subject and character descriptions are the intent: keep them recognisable and as vivid as the palette allows (only map them to a different hue when the palette is a strict short list).\nEXCLUDE: ${b.exclude}`,
  };
}

export type CharacterBrief = { name: string; kind: string; description: string };

function charactersBlock(characters: CharacterBrief[]) {
  const described = characters.filter((c) => c.description.trim());
  if (!described.length) return "";
  return `\nCHARACTERS (this is how they look; follow these descriptions closely, and where the medium can't show a detail, translate it into the medium rather than dropping it):\n${described
    .map((c) => {
      // Descriptions sometimes start by repeating the name ("Fenwick: …"); drop it.
      const desc = c.description.trim().replace(new RegExp(`^${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:—–-]\\s*`, "i"), "");
      return `- ${c.name}${c.kind !== "character" ? ` (${c.kind})` : ""}: ${desc}`;
    })
    .join("\n")}`;
}

export type CardBrief = {
  cardId: number;
  name: string;
  meaning: string;
  subject: string;
  composition: string;
};

function revisionBlock(revision?: string) {
  return revision?.trim() ? `\n\nREVISION REQUESTED BY THE ARTIST: ${revision.trim()}` : "";
}

export function buildCardPrompt(
  bible: LabStyleBible,
  brief: CardBrief,
  roles: RefRole[],
  revision?: string,
  characters: CharacterBrief[] = []
): string {
  const s = styleBlocks(bible);
  const trump = `${imageSafeCardName(brief.cardId)} (tarot trump ${romanNumeral(brief.cardId)})`;
  return `${referencesBlock(roles)}${s.artefact}

SUBJECT: ${trump}${brief.meaning ? ` — meaning: ${brief.meaning.trim().replace(/[.\s]+$/, "")}` : ""}. ${brief.subject}${charactersBlock(characters)}
COMPOSITION: ${brief.composition} The picture runs to all four edges with no border of its own.
COLOUR EMPHASIS: the characters carry the strongest, clearest colour in the picture; the background and setting stay a step quieter so the figures stand out.${revisionBlock(revision)}

${s.tail}`;
}

/** Card back for the whole deck: ornamental, symmetric, no figures or text. */
/** `design` describes this particular back (the deck can hold several and pick one). */
export function buildBackPrompt(bible: LabStyleBible, roles: RefRole[], deckTitle: string, theme: string, design?: string): string {
  const s = styleBlocks(bible);
  const hasSketch = roles.some((r) => r.kind === "sketch");
  const base = `The back of a tarot card for a deck titled "${deckTitle}"`;
  const subject = design?.trim()
    ? `${base}${hasSketch ? ", following the layout sketch" : ""}: ${design.trim()}`
    : hasSketch
      ? `${base}, following the layout sketch: redraw its emblems, field, border and ornaments as described by its shapes and colours.`
      : `${base}. An ornamental design with a central emblem drawn from the deck's world${theme ? ` (${theme.slice(0, 300)})` : ""}, surrounded by a repeating border pattern.`;
  return `${referencesBlock(roles)}${s.artefact}

SUBJECT: ${subject} An emblematic card-back design: no people, no faces, no lettering.
COMPOSITION: The central emblem is the focus and fills the middle of the card; the field and border fill the rest. The design covers the whole card, edge to edge, including its own border.

${s.tail}`;
}
