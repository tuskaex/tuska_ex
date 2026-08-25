/**
 * The Toolbox's Journal tab — MetaTrader's record of what the terminal itself
 * did this session.
 *
 * MT5's Journal is not the trade history (that is its own tab, and it comes
 * from the server). It is the client-side log: connected, order sent, order
 * filled, request rejected. So this is deliberately an in-memory ring buffer
 * and NOT persisted — a page reload starts a new session, which is exactly
 * what MetaTrader does too.
 *
 * Kept out of the zustand stores on purpose. Those stores drive the chart and
 * the blotter, and every entry appended here would re-render both; instead
 * subscribers opt in through `subscribe`, so only the Journal tab repaints
 * when a line is written. The cost of that choice is that `log()` is safe to
 * call from anywhere, including inside a render-adjacent effect, without
 * thinking about which components are listening.
 */

export type JournalLevel = 'info' | 'success' | 'error';

export interface JournalEntry {
  /** Monotonic within a session; the key React needs, and the sort order. */
  id: number;
  /** Epoch ms — rendered as HH:MM:SS in the terminal's UTC clock. */
  at: number;
  level: JournalLevel;
  /** MetaTrader prefixes each line with the subsystem that wrote it. */
  source: string;
  message: string;
}

/* MT5 caps its journal and drops the oldest lines. A terminal left open all
 * day with a chatty feed would otherwise grow without bound. */
const MAX_ENTRIES = 500;

let nextId = 1;
let entries: JournalEntry[] = [];
const listeners = new Set<(rows: JournalEntry[]) => void>();

function emit() {
  /* A fresh array every time: the Journal tab holds this in state, and
   * mutating in place would leave React comparing a reference to itself and
   * skipping the paint. */
  const snapshot = entries;
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      /* A throwing subscriber must not stop the others being told, and must
       * never propagate back into the caller that merely logged a line. */
    }
  });
}

export function log(source: string, message: string, level: JournalLevel = 'info') {
  const entry: JournalEntry = { id: nextId++, at: Date.now(), level, source, message };
  /* Newest first — the Journal renders top-down and a trader watching a fill
   * land should not have to scroll to the bottom to see it. */
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  emit();
}

export function getEntries(): JournalEntry[] {
  return entries;
}

export function clear() {
  entries = [];
  emit();
}

export function subscribe(fn: (rows: JournalEntry[]) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const journal = { log, getEntries, clear, subscribe };
export default journal;
