import type { EvidenceMeta } from "./transactions";

const DB = "waste2worth-local-evidence";
const LIMIT = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/csv"];
interface StoredEvidence { id: string; blob: Blob; size: number }
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onerror = () => reject(new Error("Local evidence storage is unavailable in this browser."));
    request.onsuccess = () => resolve(request.result);
  });
}
async function operation<T>(mode: IDBTransactionMode, perform: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const request = perform(tx.objectStore("files"));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(new Error("Could not save or read local evidence. Check browser storage space and permissions.")); };
  });
}
export async function saveEvidence(file: File, category: EvidenceMeta["category"]): Promise<EvidenceMeta> {
  if (!TYPES.includes(file.type)) throw new Error("Attach a JPG, PNG, WebP, PDF, TXT or CSV file. Active HTML and SVG are not accepted.");
  if (!file.size || file.size > LIMIT) throw new Error("Each evidence file must be nonempty and at most 5 MB.");
  const files = await operation<StoredEvidence[]>("readonly", store => store.getAll());
  if (files.reduce((sum, f) => sum + f.size, 0) + file.size > 50 * 1024 * 1024) throw new Error("The prototype allows 50 MB of evidence in this browser. Remove unused files first.");
  const id = crypto.randomUUID();
  await operation("readwrite", store => store.put({ id, blob: file, size: file.size }));
  return { id, category, name: file.name.slice(0, 200), type: file.type, size: file.size, attachedAt: new Date().toISOString() };
}
export async function downloadEvidence(meta: EvidenceMeta): Promise<void> {
  const value = await operation<StoredEvidence | undefined>("readonly", store => store.get(meta.id));
  if (!value?.blob) throw new Error("This attachment is missing from this browser. Files are not backed up or shared across devices.");
  const url = URL.createObjectURL(value.blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = meta.name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function deleteEvidence(id: string): Promise<void> { await operation("readwrite", store => store.delete(id)); }
export async function clearEvidence(): Promise<void> { await operation("readwrite", store => store.clear()); }
