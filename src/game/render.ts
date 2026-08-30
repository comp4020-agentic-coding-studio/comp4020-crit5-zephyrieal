import { isAdjacent } from "./types";
import type { GameState, RoomDef } from "./types";

function cell(x: number, y: number, className: string, children = ""): string {
  return `<div class="tile ${className}" style="--x:${x};--y:${y}">${children}</div>`;
}

// Every room is enclosed in a rectangle (closeRoom pads it to one), and that
// rectangle's own 4 corners are the only place a corner sprite belongs — not
// wherever a room's interior floor plan happens to carve a notch. So
// classification looks purely at a wall cell's position on that rectangle:
// the top 2 corners and bottom 2 corners are genuinely different sprites
// (not one texture reused via rotation — a top corner's cap faces outward
// at the top, a bottom corner's is a distinct footing piece), mirrored
// left/right via scaleX to cover both sides of the same texture. Top/bottom
// walls share the edge sprite; a plain rotate would spin its cap-vs-base
// banding onto the wrong axis, so the top row is mirrored horizontally
// (scaleX) instead, keeping the cap where it belongs while flipping
// handedness. Left/right get a dedicated vertical wall-side sprite instead
// of the horizontal edge rotated on its side, and anything fully interior
// (never touching the rectangle's own perimeter) just reuses the edge
// sprite unrotated since a wall that thick is never seen edge-on.
interface WallStyle {
  kind: "edge" | "corner" | "corner-bottom" | "side";
  rotate: number;
  flipX?: boolean;
  flipY?: boolean;
  // The bottom corners' own art (wall-corner-bottom.png) is taller than it
  // is wide. Sized by width with its aspect kept intact instead of
  // force-stretched square, that extra height naturally spills upward past
  // its own tile — reading as a footing that starts a row above the true
  // bottom border and overlaps the floor row in front of it.
  overlap?: boolean;
}

function classifyWall(width: number, height: number, x: number, y: number): WallStyle {
  const top = y === 0;
  const bottom = y === height - 1;
  const left = x === 0;
  const right = x === width - 1;

  if (top && left) return { kind: "corner", rotate: 0 };
  if (top && right) return { kind: "corner", rotate: 90 };
  if (bottom && left) return { kind: "corner-bottom", rotate: 0, flipX: true, overlap: true };
  if (bottom && right) return { kind: "corner-bottom", rotate: 0, overlap: true };
  if (top) return { kind: "edge", rotate: 0, flipX: true };
  // The bottom edge reuses the same vertical wall-side sprite as the
  // left/right walls (unrotated, laid along the row) rather than the
  // horizontal edge sprite, so it reads as the same block texture the
  // corners are made of, continuing seamlessly from them.
  if (bottom) return { kind: "side", rotate: 0 };
  // wall-side.png's lit face reads on its left, so the left wall (which
  // faces right, into the room) needs it mirrored; the right wall (facing
  // left, into the room) already has the lit face pointing the right way.
  if (left) return { kind: "side", rotate: 0, flipX: true };
  if (right) return { kind: "side", rotate: 0 };
  return { kind: "edge", rotate: 0 };
}

function wallCell(x: number, y: number, style: WallStyle): string {
  const { kind, rotate, flipX, flipY, overlap } = style;
  const fx = flipX ? -1 : 1;
  const fy = flipY ? -1 : 1;
  const overlapClass = overlap ? " wall-overlap" : "";
  return `<div class="tile wall wall-${kind}${overlapClass}" style="--x:${x};--y:${y};--rot:${rotate}deg;--fx:${fx};--fy:${fy}"></div>`;
}

export function renderRoom(root: HTMLElement, room: RoomDef, state: GameState): void {
  root.style.setProperty("--cols", String(room.width));
  root.style.setProperty("--rows", String(room.height));

  const parts: string[] = [];

  for (const wall of room.walls) {
    const style = classifyWall(room.width, room.height, wall.x, wall.y);
    parts.push(wallCell(wall.x, wall.y, style));
  }

  const locked = (room.keys ?? []).some((k) => !state.keysCollected.includes(k.id));
  parts.push(cell(room.door.x, room.door.y, `door${locked ? " locked" : ""}`));

  for (const key of room.keys ?? []) {
    if (state.keysCollected.includes(key.id)) continue;
    parts.push(cell(key.pos.x, key.pos.y, "key"));
  }

  if (room.npc) {
    const near = isAdjacent(room.npc.pos, state.player);
    parts.push(cell(room.npc.pos.x, room.npc.pos.y, `npc${near ? " glow" : ""}`));
  }

  for (const box of state.boxes) {
    const danger = box.dangerous ? ` danger-${box.clue}` : "";
    parts.push(cell(box.pos.x, box.pos.y, `box${danger}`));
  }

  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    parts.push(cell(enemy.pos.x, enemy.pos.y, `enemy enemy-${enemy.behavior} enemy-kind-${enemy.kind ?? "demon"}`));
  }

  parts.push(cell(state.player.x, state.player.y, `player facing-${state.facing}`));

  root.innerHTML = parts.join("");
}

export function renderOutcome(outcome: HTMLElement, state: GameState, isFinalRoom: boolean): void {
  outcome.dataset.phase = state.phase;
  if (state.phase === "lost") {
    outcome.textContent = "Caught. Press any key to try the room again.";
  } else if (state.phase === "won" && isFinalRoom) {
    outcome.textContent = "Clear. You found your way out.";
  } else {
    outcome.textContent = "";
  }
}

export function renderDialogue(dialogueEl: HTMLElement, room: RoomDef, state: GameState): void {
  if (room.npc && state.npcDialogueIndex >= 0) {
    dialogueEl.textContent = room.npc.lines[state.npcDialogueIndex];
    dialogueEl.hidden = false;
  } else if (room.intro && state.turn === 0) {
    dialogueEl.textContent = room.intro;
    dialogueEl.hidden = false;
  } else {
    dialogueEl.textContent = "";
    dialogueEl.hidden = true;
  }
}
