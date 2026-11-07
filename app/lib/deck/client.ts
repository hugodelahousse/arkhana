// Client-side helpers for the lab deck builder.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DeckState } from "../../../server/lab-deck/store";
import { USD } from "./pricing";

export type DeckData = Omit<DeckState, "deck"> & {
  deck: Omit<DeckState["deck"], "ownerId">;
  /** Signed in as the deck's owner (only owners can change a deck; anyone with the link can view it). */
  canEdit: boolean;
  agentRunning: boolean;
  ledger: {
    id: number;
    purpose: string;
    model: string;
    estimateMicros: number;
    costMicros: number;
    createdAt: string;
    imageId: string | null;
  }[];
};
export type DeckImage = DeckData["images"][number];
export type DeckCard = DeckData["cards"][number];
export type DeckCastMember = DeckData["cast"][number];

const KEY_STORAGE = "arkhana.lab-deck.openai-key";
const DECKS_STORAGE = "arkhana.lab-deck.decks";

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage unavailable */
  }
}

// localStorage-backed values, read with useSyncExternalStore so SSR renders
// the empty state and the client hydrates without effects.
const STORAGE_EVENT = "arkhana-lab-deck-storage";
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(STORAGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(STORAGE_EVENT, cb);
  };
}
function setStored(k: string, v: string | null) {
  safeSet(k, v);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/** Read the stored key outside React (e.g. when a chat request is sent). */
export function storedApiKey() {
  return safeGet(KEY_STORAGE);
}

/** The user's OpenAI key lives only in this browser and is sent per request. */
export function useApiKey() {
  const key = useSyncExternalStore(subscribe, storedApiKey, () => null);
  const setKey = useCallback((k: string | null) => setStored(KEY_STORAGE, k), []);
  return [key, setKey] as const;
}

export type RememberedDeck = { id: string; title: string; openedAt: number };
const NO_DECKS: RememberedDeck[] = [];
let decksCache: { raw: string | null; parsed: RememberedDeck[] } = { raw: null, parsed: NO_DECKS };
function readDecks(): RememberedDeck[] {
  const raw = safeGet(DECKS_STORAGE);
  if (raw !== decksCache.raw) {
    let parsed = NO_DECKS;
    try {
      parsed = raw ? JSON.parse(raw) : NO_DECKS;
    } catch {
      /* corrupt entry: ignore */
    }
    decksCache = { raw, parsed };
  }
  return decksCache.parsed;
}
export function useRememberedDecks() {
  return useSyncExternalStore(subscribe, readDecks, () => NO_DECKS);
}
export function rememberDeck(id: string, title: string) {
  const all = readDecks();
  if (all[0]?.id === id && all[0]?.title === title) return;
  const rest = all.filter((d) => d.id !== id);
  setStored(
    DECKS_STORAGE,
    JSON.stringify([{ id, title, openedAt: Date.now() }, ...rest].slice(0, 50))
  );
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { key?: string | null } = {}
): Promise<T> {
  const { key, ...rest } = init;
  const res = await fetch(`/api/lab-deck${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "x-openai-key": key } : {}),
      ...rest.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Object.assign(new Error(data.error ?? `Request failed (${res.status})`), {
      status: res.status,
      data,
    });
  return data as T;
}

/** Fetch the deck; poll while images are queued or running. */
export function useDeck(id: string) {
  const [data, setData] = useState<DeckData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await api<DeckData>(`/decks/${id}`);
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api<DeckData>(`/decks/${id}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const busy =
    !!data?.agentRunning ||
    !!data?.images.some((i) => i.status === "queued" || i.status === "running");
  useEffect(() => {
    if (!busy) return;
    timer.current = setTimeout(() => void refresh(), 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [busy, data, refresh]);

  return { data, error, refresh, busy };
}

export type GenerateBody = {
  action: "probe" | "drafts" | "finals" | "back";
  cardIds?: number[];
  quality?: "low" | "medium" | "high" | "xhigh";
  note?: string;
  baseImageId?: string;
  count?: number;
  /** action "back": what this back shows, and which layout sketch to follow. */
  backDesign?: string;
  sketchId?: string;
};

/** Spend: asks for confirmation over $1 (server-enforced), reports budget errors. */
export async function generate(
  deckId: string,
  key: string | null,
  body: GenerateBody
): Promise<boolean> {
  if (!key) {
    alert("Add your OpenAI API key first.");
    return false;
  }
  try {
    await api(`/decks/${deckId}/generate`, { method: "POST", key, body: JSON.stringify(body) });
    return true;
  } catch (e) {
    const err = e as Error & {
      status?: number;
      data?: {
        estimateMicros?: number;
        count?: number;
        availableMicros?: number;
        needMicros?: number;
      };
    };
    if (err.status === 409 && err.data?.estimateMicros) {
      const ok = confirm(
        `This will generate ${err.data.count} image(s) for about ${USD(err.data.estimateMicros)}. Continue?`
      );
      if (!ok) return false;
      await api(`/decks/${deckId}/generate`, {
        method: "POST",
        key,
        body: JSON.stringify({ ...body, confirm: true }),
      });
      return true;
    }
    if (err.status === 402) {
      alert(
        `Over budget: this needs about ${USD(err.data?.needMicros ?? 0)} but only ${USD(err.data?.availableMicros ?? 0)} is left. Raise the deck budget to continue.`
      );
      return false;
    }
    alert(err.message);
    return false;
  }
}

/** Live estimate for a spend button (no key needed). */
export function useEstimate(deckId: string, body: GenerateBody | null, deps: unknown) {
  const [est, setEst] = useState<{ count: number; estimateMicros: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bodyKey = JSON.stringify(body);
  useEffect(() => {
    if (!body) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<{ count: number; estimateMicros: number }>(`/decks/${deckId}/estimate`, {
        method: "POST",
        body: bodyKey,
      })
        .then((r) => !cancelled && (setEst(r), setErr(null)))
        .catch((e) => !cancelled && (setEst(null), setErr((e as Error).message)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, bodyKey, deps]);
  return { est, err };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
