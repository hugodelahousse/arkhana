// Cost model for the lab deck builder. All money is integer micro-dollars.
// Prices are $ per 1M tokens (developers.openai.com/api/docs/pricing, checked
// 2026-11-06; gpt-6.1-sol standard tier ≤272K input). The ledger always records
// cost computed from actual `usage`; estimates only gate spending.

export const IMAGE_MODELS = {
  draft: "gpt-image-2.6-flare",
  final: "gpt-image-2.6-sunburst",
} as const;
export const TEXT_MODEL = "gpt-6.1-sol";

export const WINDOW_SIZE = "896x1216"; // = frame art window
export type ImageQuality = "low" | "medium" | "high" | "xhigh" | "max";

type Rates = { textIn: number; imageIn: number; imageOut: number; textOut: number; cachedIn: number };
const IMAGE_RATES: Rates = { textIn: 5, imageIn: 8, imageOut: 30, textOut: 0, cachedIn: 1.25 };
const TEXT_RATES: Record<string, Rates> = {
  "gpt-6.1-sol": { textIn: 2, imageIn: 2, imageOut: 0, textOut: 10, cachedIn: 0.1 },
};

/** Output tokens at 896×1216 (low/medium/high measured on 2.6; xhigh/max are conservative guesses). */
export const DEFAULT_OUTPUT_TOKENS: Record<ImageQuality, number> = {
  low: 626,
  medium: 1103,
  high: 1298,
  xhigh: 2600,
  max: 4200,
};
/** Observed: a 1024² reference ≈ 1024 image input tokens; 896×1216 ≈ 1064. */
export const REF_INPUT_TOKENS = 1100;

export const USD = (micros: number) =>
  micros >= 10_000_000 ? `$${(micros / 1e6).toFixed(2)}` : `$${(micros / 1e6).toFixed(micros < 100_000 ? 3 : 2)}`;

function pixelsOf(size: string) {
  const [w, h] = size.split("x").map(Number);
  return w * h;
}

export function estimateImageMicros(opts: {
  quality: ImageQuality;
  size?: string;
  promptChars: number;
  refCount: number;
  /** Max output tokens seen for this (model, quality, size); improves the estimate. */
  observedOutputTokens?: number;
}): number {
  const size = opts.size ?? WINDOW_SIZE;
  const scale = pixelsOf(size) / pixelsOf(WINDOW_SIZE);
  const outTokens = opts.observedOutputTokens ?? Math.ceil(DEFAULT_OUTPUT_TOKENS[opts.quality] * scale);
  const textIn = Math.ceil(opts.promptChars / 3.5);
  const imageIn = opts.refCount * REF_INPUT_TOKENS;
  const dollars =
    (textIn * IMAGE_RATES.textIn + imageIn * IMAGE_RATES.imageIn + outTokens * IMAGE_RATES.imageOut) / 1e6;
  return Math.ceil(dollars * 1e6 * 1.1); // +10% headroom
}

/** Cost of an Images API response from its `usage` block. */
export function imageUsageMicros(usage: {
  input_tokens_details?: { text_tokens?: number; image_tokens?: number; cached_tokens?: number };
  output_tokens?: number;
}): number {
  const d = usage.input_tokens_details ?? {};
  const dollars =
    ((d.text_tokens ?? 0) * IMAGE_RATES.textIn +
      (d.image_tokens ?? 0) * IMAGE_RATES.imageIn +
      (usage.output_tokens ?? 0) * IMAGE_RATES.imageOut) /
    1e6;
  return Math.round(dollars * 1e6);
}

/** Cost of a language-model call from AI SDK usage. */
export function textUsageMicros(
  model: string,
  usage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }
): number {
  const r = TEXT_RATES[model] ?? TEXT_RATES[TEXT_MODEL];
  const cached = usage.cachedInputTokens ?? 0;
  const freshIn = Math.max(0, (usage.inputTokens ?? 0) - cached);
  const dollars = (freshIn * r.textIn + cached * r.cachedIn + (usage.outputTokens ?? 0) * r.textOut) / 1e6;
  return Math.round(dollars * 1e6);
}

/** Worst-case reservation for one agent chat turn (several tool steps). */
export const CHAT_TURN_RESERVE_MICROS = 80_000; // $0.08
/** Worst-case reservation for one vision critique. */
export const CRITIQUE_RESERVE_MICROS = 15_000;
/** Actions estimated above this need an explicit confirm in the UI. */
export const CONFIRM_ABOVE_MICROS = 1_000_000;
