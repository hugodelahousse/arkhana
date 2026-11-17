// Lab: casting vote. The art styles a casting deck can be drawn in: the deck builder's
// presets, minus the ones we chose not to offer here.
import { STYLE_PRESETS } from "../deck/presets";

const HIDDEN = new Set(["stained-glass", "pen-1909", "screenprint", "gold-on-black"]);

export const CASTING_PRESETS = STYLE_PRESETS.filter((p) => !HIDDEN.has(p.id));
