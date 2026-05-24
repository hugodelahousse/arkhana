export interface SpreadPosition {
  index: number;
  label: string;
  contemplationPrompt: string;
}

import { DateTime } from "luxon";

export interface SpreadTypeDefinition {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  positions: SpreadPosition[];
  isAvailable: (date: DateTime) => boolean;
  nextAvailable: (date: DateTime) => DateTime;
}

export const SPREAD_REGISTRY: Record<string, SpreadTypeDefinition> = {
  "sunday-weekly": {
    id: "sunday-weekly",
    name: "Mind · Body · Spirit · Action",
    subtitle: "A reading for the week ahead",
    description:
      "Each Sunday, four cards illuminate the week before you — one for each axis of your being. Draw them slowly. Let each card settle before reaching for the next.",
    positions: [
      {
        index: 0,
        label: "Mind",
        contemplationPrompt:
          "Before you draw, sit with your mind. What thoughts have been circling lately? What clarity are you seeking in the days ahead?",
      },
      {
        index: 1,
        label: "Body",
        contemplationPrompt:
          "Turn your attention to your body. Where do you carry tension? Where do you feel your energy? What does your body need from this week?",
      },
      {
        index: 2,
        label: "Spirit",
        contemplationPrompt:
          "What stirs in you — a longing, an intuition, a quiet pull? What does your spirit wish to tend to this week?",
      },
      {
        index: 3,
        label: "Action",
        contemplationPrompt:
          "Having sat with mind, body, and spirit — what is the one guiding action the week asks of you? What must you actually do?",
      },
    ],
    // Luxon weekday: 1=Monday … 7=Sunday
    isAvailable: (date: DateTime) => date.setZone("utc").weekday === 7,
    nextAvailable: (date: DateTime) => {
      const utc = date.setZone("utc");
      const daysUntil = (7 - utc.weekday) % 7 || 7;
      return utc.plus({ days: daysUntil }).startOf("day");
    },
  },
};

export function getSpreadType(id: string): SpreadTypeDefinition | null {
  return SPREAD_REGISTRY[id] ?? null;
}

export function getTodaySpreadType(date: DateTime): SpreadTypeDefinition | null {
  return (
    Object.values(SPREAD_REGISTRY).find((s) => s.isAvailable(date)) ?? null
  );
}
