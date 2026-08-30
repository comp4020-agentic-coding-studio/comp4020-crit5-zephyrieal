import type { Action, Dir } from "./types";

const KEY_TO_DIR: Record<string, Dir> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

// Maps a raw key to the action it would produce while play is ongoing.
// Callers decide separately what any key should do once play has ended.
export function actionForKey(key: string): Action | null {
  const lower = key.toLowerCase();
  if (lower === "e") return { type: "interact" };
  const dir = KEY_TO_DIR[lower];
  return dir ? { type: "move", dir } : null;
}

export function bindKeydown(onKey: (key: string, event: KeyboardEvent) => void): () => void {
  const handler = (event: KeyboardEvent) => onKey(event.key, event);
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
