import { createContext, useContext } from "react";

export interface CardStyleConfig {
  style: "classic" | "procgen";
  userId?: string;
}

export const CardStyleContext = createContext<CardStyleConfig>({ style: "classic" });

export function useCardStyle(): CardStyleConfig {
  return useContext(CardStyleContext);
}
