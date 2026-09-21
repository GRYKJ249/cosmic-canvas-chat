/**
 * Browser-only data layer.
 *
 * Everything the app used to save on a server is now kept inside the visitor's
 * own browser: rows in localStorage, generated images in IndexedDB.
 */

const PREFIX = "opera-ai:";
const hasWindow = () => typeof window !== "undefined";

export type Row = Record<string, unknown> & { id: string };

export function readTable(table: string): Row[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + table);
    const parsed = raw ? (JSON.parse(raw) as Row[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeTable(table: string, rows: Row[]) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(PREFIX + table, JSON.stringify(rows));
  } catch {
    /* storage full — keep the app usable */
  }
}

export const LOCAL_USER_ID = "local-user";

export function localUser() {
  return {
    id: LOCAL_USER_ID,
    email: "you@this-browser",
    email_confirmed_at: new Date(0).toISOString(),
    created_at: new Date(0).toISOString(),
    user_metadata: {},
    app_metadata: {},
    aud: "local",
  };
}

/* ---------------------------------- files --------------------------------- */

const DB_NAME = "opera-ai-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (!hasWindow() || !window.indexedDB) return Promise.reject(new Error("No browser storage available"));
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function putFile(path: string, blob: Blob) {
  const dataUrl = await blobToDataUrl(blob);
  await tx("readwrite", (store) => store.put(dataUrl, path));
}

export async function getFile(path: string): Promise<string | null> {
  try {
    const value = await tx<string | undefined>("readonly", (store) => store.get(path));
    return value ?? null;
  } catch {
    return null;
  }
}

export async function removeFiles(paths: string[]) {
  for (const path of paths) {
    try {
      await tx("readwrite", (store) => store.delete(path));
    } catch {
      /* ignore */
    }
  }
}
