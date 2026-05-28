import { rasterizeSvg } from "./rasterizeSvg";
import type { WorkerRequest, WorkerResponse } from "../workers/procgen-tarot.worker";

const DB_NAME = "procgen-tarot";
const DB_VERSION = 1;
const STORE = "cards";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

type Listener = (url: string) => void;

let worker: Worker | null = null;
let db: IDBDatabase | null = null;
const pending = new Map<string, Listener[]>();
const urlCache = new Map<string, string>();

function cacheKey(cardId: number, seed: number): string {
  return `${cardId}:${seed}`;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/procgen-tarot.worker.ts", import.meta.url),
      { type: "module" },
    );
  }
  return worker;
}

async function rasterizeAndStore(key: string, svg: string): Promise<string> {
  const blobUrl = await rasterizeSvg(svg);
  urlCache.set(key, blobUrl);

  const res = await fetch(blobUrl);
  const blob = await res.blob();
  if (!db) db = await openDB();
  await idbPut(db, key, blob);

  const listeners = pending.get(key) ?? [];
  pending.delete(key);
  for (const fn of listeners) fn(blobUrl);
  return blobUrl;
}

export async function getProcgenCard(
  cardId: number,
  seed: number,
  onReady: (url: string) => void,
): Promise<void> {
  const key = cacheKey(cardId, seed);

  if (urlCache.has(key)) {
    onReady(urlCache.get(key)!);
    return;
  }

  if (!db) db = await openDB();
  const cached = await idbGet(db, key);
  if (cached) {
    const blobUrl = URL.createObjectURL(cached);
    urlCache.set(key, blobUrl);
    onReady(blobUrl);
    return;
  }

  if (pending.has(key)) {
    pending.get(key)!.push(onReady);
    return;
  }
  pending.set(key, [onReady]);

  const w = getWorker();
  const handler = (e: MessageEvent<WorkerResponse>) => {
    if (e.data.type !== "card-done" || e.data.cardId !== cardId) return;
    w.removeEventListener("message", handler);
    rasterizeAndStore(key, e.data.svg);
  };
  w.addEventListener("message", handler);
  w.postMessage({
    type: "generate-one",
    cardId,
    deckSeed: seed,
  } satisfies WorkerRequest);
}

export async function pregenerateAll(seed: number): Promise<void> {
  if (!db) db = await openDB();

  const needed: number[] = [];
  for (let id = 0; id < 78; id++) {
    const key = cacheKey(id, seed);
    if (urlCache.has(key)) continue;
    const cached = await idbGet(db, key);
    if (cached) {
      urlCache.set(key, URL.createObjectURL(cached));
      continue;
    }
    needed.push(id);
  }
  if (needed.length === 0) return;

  const w = getWorker();
  const needSet = new Set(needed);

  return new Promise((resolve) => {
    const handler = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "card-done" && needSet.has(msg.cardId)) {
        const key = cacheKey(msg.cardId, seed);
        needSet.delete(msg.cardId);
        rasterizeAndStore(key, msg.svg);
      }
      if (msg.type === "all-done") {
        w.removeEventListener("message", handler);
        resolve();
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({
      type: "generate-all",
      deckSeed: seed,
    } satisfies WorkerRequest);
  });
}
