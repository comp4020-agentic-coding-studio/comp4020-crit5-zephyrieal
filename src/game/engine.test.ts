import { describe, expect, it } from "vitest";
import { checkLoss, resolveEnemies, step, tryMove } from "./engine";
import type { BoxDef, EnemyDef, GameState, RoomDef } from "./types";

// A tiny hand-built room, independent of the shipped rooms.ts layouts, so
// these tests don't have to be re-derived every time a room is retuned.
function makeRoom(overrides: Partial<RoomDef> = {}): RoomDef {
  return {
    id: "test-room",
    width: 6,
    height: 5,
    playerStart: { x: 0, y: 0 },
    door: { x: 5, y: 4 },
    walls: [],
    boxes: [],
    enemies: [],
    ...overrides,
  };
}

function makeState(room: RoomDef): GameState {
  return {
    roomIndex: 0,
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

describe("tryMove: pushing", () => {
  it("moves a pushed box exactly one cell, and the player follows", () => {
    const box: BoxDef = { id: "b", pos: { x: 1, y: 0 }, dangerous: false, clue: "none" };
    const room = makeRoom({ playerStart: { x: 0, y: 0 }, boxes: [box] });
    const state = makeState(room);

    const next = tryMove(room, state, "right");

    expect(next.player).toEqual({ x: 1, y: 0 });
    expect(next.boxes[0].pos).toEqual({ x: 2, y: 0 });
  });

  it("is a full no-op when the push destination is a wall or another box", () => {
    const boxA: BoxDef = { id: "a", pos: { x: 1, y: 0 }, dangerous: false, clue: "none" };
    const boxB: BoxDef = { id: "b", pos: { x: 2, y: 0 }, dangerous: false, clue: "none" };
    const room = makeRoom({ playerStart: { x: 0, y: 0 }, boxes: [boxA, boxB] });
    const state = makeState(room);

    const next = tryMove(room, state, "right");

    expect(next).toBe(state);
  });

  it("releases a dangerous box's enemy, but never moves a safe box's", () => {
    const dangerous: BoxDef = {
      id: "d",
      pos: { x: 1, y: 0 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e1",
    };
    const safe: BoxDef = { id: "s", pos: { x: 1, y: 2 }, dangerous: false, clue: "none" };
    const enemy: EnemyDef = { id: "e1", pos: { x: 4, y: 4 }, active: false, behavior: "guard" };
    const room = makeRoom({ playerStart: { x: 0, y: 0 }, boxes: [dangerous, safe], enemies: [enemy] });
    const state = makeState(room);

    const afterDangerous = tryMove(room, state, "right");
    expect(afterDangerous.enemies[0].active).toBe(true);
    expect(afterDangerous.enemies[0].pos).toEqual({ x: 4, y: 4 });

    const stateAtSafeBox = { ...state, player: { x: 0, y: 2 } };
    const afterSafe = tryMove(room, stateAtSafeBox, "right");
    expect(afterSafe.enemies[0].active).toBe(false);
  });

  it("never lets a box come to rest on the door", () => {
    const box: BoxDef = { id: "b", pos: { x: 4, y: 4 }, dangerous: false, clue: "none" };
    const room = makeRoom({ playerStart: { x: 3, y: 4 }, door: { x: 5, y: 4 }, boxes: [box] });
    const state = makeState(room);

    const next = tryMove(room, state, "right");

    expect(next).toBe(state);
  });
});

describe("tryMove: walking", () => {
  it("walking into a wall is a no-op", () => {
    const room = makeRoom({ playerStart: { x: 0, y: 0 }, walls: [{ x: 1, y: 0 }] });
    const state = makeState(room);

    const next = tryMove(room, state, "right");

    expect(next).toBe(state);
  });
});

describe("loss and win", () => {
  it("ends the run in a loss when an active enemy shares the player's cell", () => {
    const enemy: EnemyDef = { id: "e", pos: { x: 1, y: 0 }, active: true, behavior: "guard" };
    const room = makeRoom({ enemies: [enemy] });
    const state = { ...makeState(room), player: { x: 1, y: 0 } };

    expect(checkLoss(state).phase).toBe("lost");
  });

  it("wins the room by reaching the door tile", () => {
    const room = makeRoom({ door: { x: 4, y: 0 } });
    const state = { ...makeState(room), player: { x: 3, y: 0 } };

    const next = step(room, state, { type: "move", dir: "right" });

    expect(next.phase).toBe("won");
  });

  it("a locked door blocks movement until its key is collected", () => {
    const room = makeRoom({ door: { x: 4, y: 0 }, keys: [{ id: "k", pos: { x: 2, y: 0 } }] });
    const lockedState = { ...makeState(room), player: { x: 3, y: 0 } };
    const unlockedState = { ...lockedState, keysCollected: ["k"] };

    expect(tryMove(room, lockedState, "right").player).toEqual({ x: 3, y: 0 });
    expect(tryMove(room, unlockedState, "right").player).toEqual({ x: 4, y: 0 });
  });

  it("a door with two keys stays locked until both are collected", () => {
    const room = makeRoom({
      door: { x: 4, y: 0 },
      keys: [
        { id: "a", pos: { x: 1, y: 0 } },
        { id: "b", pos: { x: 2, y: 0 } },
      ],
    });
    const atDoor = { x: 3, y: 0 };
    const onlyA = { ...makeState(room), player: atDoor, keysCollected: ["a"] };
    const both = { ...onlyA, keysCollected: ["a", "b"] };

    expect(tryMove(room, onlyA, "right").player).toEqual(atDoor);
    expect(tryMove(room, both, "right").player).toEqual({ x: 4, y: 0 });
  });

  it("walking onto a key tile collects only that key", () => {
    const room = makeRoom({
      keys: [
        { id: "a", pos: { x: 1, y: 0 } },
        { id: "b", pos: { x: 2, y: 0 } },
      ],
    });
    const state = makeState(room);

    const next = tryMove(room, state, "right");

    expect(next.keysCollected).toEqual(["a"]);
  });
});

describe("enemy movement", () => {
  it("a chase enemy takes exactly one Manhattan step toward the player per turn", () => {
    const enemy: EnemyDef = { id: "c", pos: { x: 0, y: 0 }, active: true, behavior: "chase" };
    const room = makeRoom({ enemies: [enemy] });
    const state = { ...makeState(room), player: { x: 3, y: 3 } };

    const next = resolveEnemies(room, state);

    const moved = next.enemies[0].pos;
    const distanceMoved = Math.abs(moved.x - 0) + Math.abs(moved.y - 0);
    expect(distanceMoved).toBe(1);
  });

  it("a patrol enemy follows its fixed route regardless of where the player is", () => {
    const route = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ];
    const enemy: EnemyDef = {
      id: "p",
      pos: { x: 0, y: 0 },
      active: true,
      behavior: "patrol",
      patrolRoute: route,
      patrolIndex: 1, // heading toward (2, 0) first, away from the player below
    };
    const room = makeRoom({ enemies: [enemy] });
    const farPlayerState = { ...makeState(room), player: { x: 5, y: 4 } };
    const nearPlayerState = { ...makeState(room), player: { x: 1, y: 0 } };

    const fromFar = resolveEnemies(room, farPlayerState).enemies[0].pos;
    const fromNear = resolveEnemies(room, nearPlayerState).enemies[0].pos;

    expect(fromFar).toEqual({ x: 1, y: 0 });
    expect(fromNear).toEqual({ x: 1, y: 0 });
  });
});

describe("step", () => {
  it("restart resets to the room's initial state from any phase", () => {
    const room = makeRoom({ playerStart: { x: 0, y: 0 } });
    const wonState: GameState = { ...makeState(room), player: { x: 5, y: 4 }, phase: "won", turn: 9 };

    const next = step(room, wonState, { type: "restart" });

    expect(next.player).toEqual({ x: 0, y: 0 });
    expect(next.phase).toBe("playing");
    expect(next.turn).toBe(0);
  });

  it("interact only advances NPC dialogue when the player is orthogonally adjacent", () => {
    const room = makeRoom({
      playerStart: { x: 0, y: 0 },
      npc: { id: "n", pos: { x: 2, y: 0 }, lines: ["one", "two"] },
    });
    const farState = makeState(room);
    const adjacentState = { ...makeState(room), player: { x: 1, y: 0 } };

    const noOp = step(room, farState, { type: "interact" });
    expect(noOp.npcDialogueIndex).toBe(-1);

    const advanced = step(room, adjacentState, { type: "interact" });
    expect(advanced.npcDialogueIndex).toBe(0);
  });
});
