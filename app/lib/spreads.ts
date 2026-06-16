export interface SpreadPosition {
  index: number;
  label: string;
  contemplationPrompt: string;
}

export type SpreadPositionKey =
  // sunday-weekly
  | "mind" | "body" | "spirit" | "action"
  // new-moon
  | "the gift" | "what to release" | "the seed" | "the obstacle" | "first steps"
  // full-moon
  | "what has grown" | "what is illuminated" | "what hides in the light"
  | "what must be released" | "how to let go" | "what emerges";

import { DateTime } from "luxon";
import { isMoonEventOnDate, nextMoonEventDate } from "./moonphase";

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
    isAvailable: (date: DateTime) => date.weekday === 7,
    nextAvailable: (date: DateTime) => {
      const daysUntil = (7 - date.weekday) % 7 || 7;
      return date.plus({ days: daysUntil }).startOf("day");
    },
  },
  "new-moon": {
    id: "new-moon",
    name: "Seeds of Intention",
    subtitle: "A reading for the new moon",
    description:
      "The new moon is a blank slate — a darkness full of potential. Five cards to plant your intentions and illuminate the cycle ahead. Draw slowly. Let each position settle before you name what you seek.",
    positions: [
      {
        index: 0,
        label: "The Gift",
        contemplationPrompt:
          "Breathe into the darkness. What energy does this new moon carry for you? What theme or lesson is pressing itself forward at this threshold?",
      },
      {
        index: 1,
        label: "What to Release",
        contemplationPrompt:
          "The new moon asks us to compost the old. What from the last cycle — a habit, a thought, a grief — must be surrendered to make room for what comes next?",
      },
      {
        index: 2,
        label: "The Seed",
        contemplationPrompt:
          "What intention is ready to take root in this fertile darkness? Name it quietly, without forcing it into shape. What do you most wish to grow?",
      },
      {
        index: 3,
        label: "The Obstacle",
        contemplationPrompt:
          "As the seed stirs, what resistance might rise to meet it? What part of you or your circumstances may push back against this intention?",
      },
      {
        index: 4,
        label: "First Steps",
        contemplationPrompt:
          "Intentions live or die by their first movement. What single, concrete act carries this seed forward into the world? What must you actually do?",
      },
    ],
    isAvailable: (date: DateTime) => isMoonEventOnDate(date.toISODate()!, "new-moon"),
    nextAvailable: (date: DateTime) => nextMoonEventDate(date, "new-moon"),
  },
  "full-moon": {
    id: "full-moon",
    name: "Illumination & Release",
    subtitle: "A reading for the full moon",
    description:
      "The full moon floods everything with light — it reveals what you could not see and asks you to release what is finished. Six cards for completion, truth, and the surrender that opens the way forward.",
    positions: [
      {
        index: 0,
        label: "What Has Grown",
        contemplationPrompt:
          "Since the last new moon, what has come to fruition — expected or not? Look at what has changed in you, not just around you.",
      },
      {
        index: 1,
        label: "What Is Illuminated",
        contemplationPrompt:
          "The full moon hides nothing. What truth can you now see clearly that was obscured before? What situation or feeling has finally come into full light?",
      },
      {
        index: 2,
        label: "What Hides in the Light",
        contemplationPrompt:
          "Even under full illumination, something stays in shadow. What truth are you still circling around — present but not yet faced?",
      },
      {
        index: 3,
        label: "What Must Be Released",
        contemplationPrompt:
          "What is complete — ready to be laid down so it can become something new? What are you still carrying that has already served its purpose?",
      },
      {
        index: 4,
        label: "How to Let Go",
        contemplationPrompt:
          "Release is rarely a single act. What will support you through this surrender — a practice, a perspective, a person, a moment of stillness?",
      },
      {
        index: 5,
        label: "What Emerges",
        contemplationPrompt:
          "Once you set down what is finished, what space opens? What begins to stir at the edges of this ending — the first shape of what comes next?",
      },
    ],
    isAvailable: (date: DateTime) => isMoonEventOnDate(date.toISODate()!, "full-moon"),
    nextAvailable: (date: DateTime) => nextMoonEventDate(date, "full-moon"),
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
