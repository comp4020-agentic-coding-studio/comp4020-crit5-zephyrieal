import type { Action, BoxDef, Dir, EnemyDef, GameState, RoomDef, Vec2 } from "./types";
import { DELTA, add, eq, isAdjacent } from "./types";

function inBounds(room: RoomDef, pos: Vec2): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < room.width && pos.y < room.height;
}

function isWall(room: RoomDef, pos: Vec2): boolean {
  return room.walls.some((w) => eq(w, pos));
}

function boxAt(boxes: BoxDef[], pos: Vec2): BoxDef | undefined {
  return boxes.find((b) => eq(b.pos, pos));
}

function isLocked(room: RoomDef, state: GameState): boolean {
  return (room.keys ?? []).some((k) => !state.keysCollected.includes(k.id));
}

export function createGameState(room: RoomDef, roomIndex: number): GameState {
  return {
    roomIndex,
    player: { ...room.playerStart },
    facing: "down",
    boxes: room.boxes.map((b) => ({ ...b, pos: { ...b.pos } })),
    enemies: room.enemies.map((e) => ({ ...e, pos: { ...e.pos } })),
    keysCollected: [],
    npcDialogueIndex: -1,
    phase: "playing",
    turn: 0,
  };
}

export function tryMove(room: RoomDef, state: GameState, dir: Dir): GameState {
  const delta = DELTA[dir];
  const target = add(state.player, delta);
  if (!inBounds(room, target) || isWall(room, target)) return state;
  if (room.npc && eq(room.npc.pos, target)) return state;
  // A locked door is a wall bump like any other, until every one of the
  // room's keys has been collected.
  if (eq(target, room.door) && isLocked(room, state)) return state;

  const key = (room.keys ?? []).find((k) => eq(k.pos, target) && !state.keysCollected.includes(k.id));
  if (key) {
    return { ...state, player: target, keysCollected: [...state.keysCollected, key.id] };
  }

  const box = boxAt(state.boxes, target);
  if (box) {
    const pushTarget = add(target, delta);
    // The door never accepts a crate — a box can only ever rest on a cell
    // that isn't also a win condition, so a push can never wall off the exit.
    if (
      !inBounds(room, pushTarget) ||
      isWall(room, pushTarget) ||
      boxAt(state.boxes, pushTarget) ||
      eq(pushTarget, room.door)
    ) {
      return state;
    }
    const boxes = state.boxes.map((b) => (b.id === box.id ? { ...b, pos: pushTarget } : b));
    let enemies = state.enemies;
    if (box.dangerous && box.releasesEnemyId) {
      enemies = state.enemies.map((e) =>
        e.id === box.releasesEnemyId ? { ...e, active: true } : e,
      );
    }
    return { ...state, player: target, boxes, enemies };
  }

  return { ...state, player: target };
}

function stepToward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return from;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: from.x + Math.sign(dx), y: from.y };
  }
  return { x: from.x, y: from.y + Math.sign(dy) };
}

function enemyBlocked(room: RoomDef, state: GameState, self: EnemyDef, pos: Vec2): boolean {
  if (!inBounds(room, pos) || isWall(room, pos)) return true;
  if (boxAt(state.boxes, pos)) return true;
  if (room.npc && eq(room.npc.pos, pos)) return true;
  return state.enemies.some((e) => e.active && e.id !== self.id && eq(e.pos, pos));
}

export function resolveEnemies(room: RoomDef, state: GameState): GameState {
  const enemies = state.enemies.map((enemy) => {
    if (!enemy.active) return enemy;

    if (enemy.behavior === "chase") {
      const next = stepToward(enemy.pos, state.player);
      return enemyBlocked(room, state, enemy, next) ? enemy : { ...enemy, pos: next };
    }

    // patrol / guard: pace a fixed route, ignoring the player entirely. No
    // route (or a single waypoint) means it just stands its ground.
    const route = enemy.patrolRoute;
    if (!route || route.length < 2) return enemy;
    let index = enemy.patrolIndex ?? 0;
    if (eq(enemy.pos, route[index])) index = (index + 1) % route.length;
    const next = stepToward(enemy.pos, route[index]);
    if (enemyBlocked(room, state, enemy, next)) return { ...enemy, patrolIndex: index };
    return { ...enemy, pos: next, patrolIndex: index };
  });
  return { ...state, enemies };
}

export function checkLoss(state: GameState): GameState {
  const caught = state.enemies.some((e) => e.active && eq(e.pos, state.player));
  return caught ? { ...state, phase: "lost" } : state;
}

export function checkWin(room: RoomDef, state: GameState): GameState {
  if (state.phase === "playing" && eq(state.player, room.door)) {
    return { ...state, phase: "won" };
  }
  return state;
}

export function step(room: RoomDef, state: GameState, action: Action): GameState {
  if (action.type === "restart") {
    return createGameState(room, state.roomIndex);
  }
  if (state.phase !== "playing") return state;

  if (action.type === "interact") {
    const npc = room.npc;
    if (!npc || !isAdjacent(npc.pos, state.player)) return state;
    const nextIndex = Math.min(state.npcDialogueIndex + 1, npc.lines.length - 1);
    return { ...state, npcDialogueIndex: nextIndex };
  }

  const moved = tryMove(room, state, action.dir);
  // Bumping a wall still turns the player to face it — a free, silent way to
  // read a room's layout without spending a real move.
  if (moved === state) return { ...state, facing: action.dir };

  let next = { ...moved, facing: action.dir, turn: moved.turn + 1 };
  next = resolveEnemies(room, next);
  next = checkLoss(next);
  next = checkWin(room, next);

  if (room.npc && !isAdjacent(room.npc.pos, next.player) && next.npcDialogueIndex !== -1) {
    next = { ...next, npcDialogueIndex: -1 };
  }

  return next;
}

export function nextRoom(rooms: RoomDef[], state: GameState): GameState {
  const roomIndex = state.roomIndex + 1;
  return createGameState(rooms[roomIndex], roomIndex);
}
