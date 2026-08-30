export type Vec2 = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";

export const DELTA: Record<Dir, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function eq(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isAdjacent(a: Vec2, b: Vec2): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export type DangerClue = "obvious" | "subtle" | "none";

export interface BoxDef {
  id: string;
  pos: Vec2;
  dangerous: boolean;
  clue: DangerClue;
  releasesEnemyId?: string;
}

export type EnemyBehavior = "patrol" | "guard" | "chase";
export type EnemyKind = "demon" | "slime" | "skeleton" | "ghost";

export interface EnemyDef {
  id: string;
  pos: Vec2;
  active: boolean;
  behavior: EnemyBehavior;
  // Omitted defaults to "demon" at render time.
  kind?: EnemyKind;
  // A route of 2+ waypoints makes patrol/guard actually pace back and forth.
  // Omitted (or a single waypoint) means the enemy stands its ground once released.
  patrolRoute?: Vec2[];
  patrolIndex?: number;
}

export interface NpcDef {
  id: string;
  pos: Vec2;
  lines: string[];
}

export interface KeyDef {
  id: string;
  pos: Vec2;
}

export interface RoomDef {
  id: string;
  width: number;
  height: number;
  walls: Vec2[];
  boxes: BoxDef[];
  enemies: EnemyDef[];
  npc?: NpcDef;
  // Omitted or empty means the door is never locked.
  keys?: KeyDef[];
  // A single line the player "thinks" on arrival, shown until their first
  // real step (turn 0 only) — omitted means the room opens silently.
  intro?: string;
  playerStart: Vec2;
  door: Vec2;
}

export type Action = { type: "move"; dir: Dir } | { type: "interact" } | { type: "restart" };

export type Phase = "playing" | "won" | "lost";

export interface GameState {
  roomIndex: number;
  player: Vec2;
  facing: Dir;
  boxes: BoxDef[];
  enemies: EnemyDef[];
  keysCollected: string[];
  npcDialogueIndex: number;
  phase: Phase;
  turn: number;
}
