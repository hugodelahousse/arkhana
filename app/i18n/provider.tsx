import { createContext, useContext } from "react";
import type { Locale } from "./index";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>;

const translations: Record<string, Dict> = { en, fr };

function get(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return path;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

type I18nCtx = { locale: Locale; t: TFunction };

const I18nContext = createContext<I18nCtx>({ locale: "en", t: (k) => k });

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const dict: Dict = translations[locale] ?? translations.en;

  function t(key: string, vars?: Record<string, string | number>): string {
    return interpolate(get(dict, key), vars);
  }

  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useT(): TFunction {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
