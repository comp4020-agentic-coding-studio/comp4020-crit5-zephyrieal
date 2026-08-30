import type { RoomDef, Vec2 } from "./types";

function wallsExcept(width: number, height: number, floor: Vec2[]): Vec2[] {
  const isFloor = (x: number, y: number) => floor.some((f) => f.x === x && f.y === y);
  const walls: Vec2[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isFloor(x, y)) walls.push({ x, y });
    }
  }
  return walls;
}

// Every room below is authored against its own floor plan, then run through
// closeRoom (bottom of this file), which wraps a uniform 1-tile wall border
// around every side. That's what keeps a play area that happens to touch a
// room's edge (a spawn point on the left, a door on the right) from leaving a
// gap in the wall there — the border is added after the fact, not baked into
// each room's own coordinates.

// Room 0 — arrival. Nothing to push, nothing hiding; a single straight
// corridor to a door already glowing in view. The only lesson is that
// movement works at all, and the opening line ("where am I? need to get out
// of here") gives the walk a reason before room 1 introduces pushing.
const room0: RoomDef = {
  id: "room-0",
  width: 5,
  height: 3,
  playerStart: { x: 0, y: 1 },
  door: { x: 4, y: 1 },
  walls: wallsExcept(5, 3, [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ]),
  boxes: [],
  enemies: [],
  intro: "Where am I? Need to get out of here.",
};

// Room 1 — learn pushing. From spawn, every direction but one is a wall bump;
// pushing the crate is the only thing that does anything, and it opens onto a
// small room with the door glowing in view.
const room1: RoomDef = {
  id: "room-1",
  width: 5,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 4, y: 2 },
  walls: wallsExcept(5, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 4, y: 1 },
    { x: 4, y: 2 },
  ]),
  boxes: [{ id: "b1", pos: { x: 1, y: 2 }, dangerous: false, clue: "none" }],
  enemies: [],
};

// Room 2 — first danger, plus the first key. The door is locked until the
// key (sitting in the open alcove, away from both the crate and the
// chaser's spawn) is picked up — so the "optional" side room from before is
// now a required stop, while triggering the crate stays entirely avoidable.
const room2: RoomDef = {
  id: "room-2",
  width: 6,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 5, y: 2 },
  walls: wallsExcept(6, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ]),
  boxes: [
    {
      id: "b2",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e2",
    },
  ],
  enemies: [{ id: "e2", pos: { x: 1, y: 1 }, active: false, behavior: "chase", kind: "slime" }],
  keys: [{ id: "k2", pos: { x: 2, y: 1 } }],
};

// Room 3 — order matters. The main corridor never touches a box, so the door
// is always reachable. Two optional side crates each wake a threat; the left
// one wakes a patrol pacing its pocket's mouth (a lingering player can walk
// back into it), the right one a chase enemy resting back at the entrance,
// well behind the release point. Pushing the left crate first seals off the
// right pocket's entrance, so exploring in the wrong order costs you the
// *other* pocket's discovery, not the exit.
const room3: RoomDef = {
  id: "room-3",
  width: 7,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 6, y: 2 },
  walls: wallsExcept(7, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
  ]),
  boxes: [
    {
      id: "b3b",
      pos: { x: 2, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e3b",
    },
    {
      id: "b3a",
      pos: { x: 4, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e3a",
    },
  ],
  enemies: [
    {
      id: "e3b",
      pos: { x: 0, y: 1 },
      active: false,
      behavior: "patrol",
      kind: "skeleton",
      patrolRoute: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    },
    { id: "e3a", pos: { x: 0, y: 2 }, active: false, behavior: "chase", kind: "ghost" },
  ],
};

// Room 4 — hidden danger, plus a key. Five near-identical crates; two are
// dangerous, told apart only by a faint tint, no crack. Clearing the one
// crate on the direct line is mandatory; the other four sit in the open room
// around it, free to inspect, push or leave alone. The key sits right next
// to one of the subtly-dangerous crates, so fetching it — mandatory, since
// the door is locked without it — puts the faint tint in view rather than
// only rewarding players who wandered over on their own.
const room4: RoomDef = {
  id: "room-4",
  width: 7,
  height: 5,
  playerStart: { x: 0, y: 2 },
  door: { x: 6, y: 2 },
  walls: wallsExcept(7, 5, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
    { x: 5, y: 3 },
    { x: 6, y: 3 },
  ]),
  boxes: [
    { id: "b4m", pos: { x: 1, y: 2 }, dangerous: false, clue: "none" },
    { id: "d1", pos: { x: 2, y: 1 }, dangerous: false, clue: "none" },
    {
      id: "d2",
      pos: { x: 4, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e4d2",
    },
    { id: "d3", pos: { x: 4, y: 2 }, dangerous: false, clue: "none" },
    {
      id: "d4",
      pos: { x: 4, y: 3 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e4d4",
    },
  ],
  enemies: [
    // Stationary: these two sit on opposite sides of the open corridor
    // (row 1 above it, row 3 below), and a chaser isn't confined to its own
    // row — it drifts toward wherever the player currently is. A player who
    // triggers one while circling back for the key below would have it cut
    // straight across the corridor, including onto the door tile itself.
    // Both pockets are meant to be safe to explore either way, so both stay
    // guards.
    { id: "e4d2", pos: { x: 6, y: 1 }, active: false, behavior: "guard", kind: "ghost" },
    { id: "e4d4", pos: { x: 6, y: 3 }, active: false, behavior: "guard", kind: "ghost" },
  ],
  keys: [{ id: "k4", pos: { x: 5, y: 3 } }],
};

// Room 5 — an NPC waits beside (not blocking) the open path to the door, and
// a separate obviously-dangerous crate sits in a small side alcove reached
// from the far end of the corridor.
const room5: RoomDef = {
  id: "room-5",
  width: 6,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 5, y: 2 },
  walls: wallsExcept(6, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
  ]),
  boxes: [
    {
      id: "b5",
      pos: { x: 4, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e5",
    },
  ],
  enemies: [{ id: "e5", pos: { x: 0, y: 2 }, active: false, behavior: "chase", kind: "skeleton" }],
  npc: {
    id: "npc5",
    pos: { x: 2, y: 1 },
    lines: [
      "Something in this room doesn't sit right with me.",
      "The crate by the far wall creaks when no one's near it.",
      "I wouldn't trust my own nose down here, for what it's worth.",
    ],
  },
};

// Room 6 — the chase. Pushing the one crate down out of the way drops the
// player onto a long, straight, already-open corridor to the door, and wakes
// a chase enemy resting behind the release point. A chase enemy that starts
// behind the player on the same row can never close a head start it doesn't
// have: every turn it steps toward the player's *new* cell, so if the player
// keeps moving the same direction it trails at a constant distance rather
// than cutting the corner. It's right on your heels the whole sprint, but a
// player who keeps moving reaches the door before it ever catches up.
const room6: RoomDef = {
  id: "room-6",
  width: 9,
  height: 4,
  playerStart: { x: 2, y: 1 },
  door: { x: 8, y: 2 },
  walls: wallsExcept(9, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: 3 },
  ]),
  boxes: [
    {
      id: "b6",
      pos: { x: 2, y: 2 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e6",
    },
  ],
  enemies: [{ id: "e6", pos: { x: 0, y: 2 }, active: false, behavior: "chase", kind: "demon" }],
};

// Room 7 — two keys, two pockets. Merges room 2's obvious-clue pocket and
// room 4's subtle-clue pocket into one room, both keys required before the
// door unlocks — the first room where isLocked actually has to AND over more
// than one key. A wall column separates the pockets so they read as two
// distinct puzzles rather than one blurred row.
const room7: RoomDef = {
  id: "room-7",
  width: 11,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 10, y: 2 },
  walls: wallsExcept(11, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
  ]),
  boxes: [
    {
      id: "b7a",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e7a",
    },
    {
      id: "b7b",
      pos: { x: 8, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e7b",
    },
  ],
  enemies: [
    // A wall column separates the two pockets, so clearing this one only
    // to have it start chasing would force a blind re-entry into the next
    // pocket's mouth to reach the door — a chaser that's been trailing
    // along the corridor ends up shadowing the player's own column exactly,
    // so stepping back up into pocket B would step right onto it. Only the
    // *last* pocket before the door is safe to wake a chaser in; this one
    // stays a stationary guard.
    { id: "e7a", pos: { x: 1, y: 1 }, active: false, behavior: "guard", kind: "slime" },
    { id: "e7b", pos: { x: 6, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
  ],
  keys: [
    { id: "k7a", pos: { x: 2, y: 1 } },
    { id: "k7b", pos: { x: 7, y: 1 } },
  ],
};

// Room 8 — triple-pocket ordering corridor. Extends room 3's shared-row,
// order-matters shape from two side crates to three: a safe decoy (no clue,
// just a normal push — a reminder that not everything is a trap), a
// subtle-danger crate waking a patrol, and an obvious-danger crate waking a
// chaser resting well back at the corridor's start, all reachable from the
// same open corridor.
const room8: RoomDef = {
  id: "room-8",
  width: 9,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 8, y: 2 },
  walls: wallsExcept(9, 4, [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
  ]),
  boxes: [
    { id: "b8s", pos: { x: 2, y: 1 }, dangerous: false, clue: "none" },
    {
      id: "b8sub",
      pos: { x: 4, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e8p",
    },
    {
      id: "b8obv",
      pos: { x: 6, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e8g",
    },
  ],
  enemies: [
    {
      id: "e8p",
      pos: { x: 0, y: 1 },
      active: false,
      behavior: "patrol",
      kind: "skeleton",
      patrolRoute: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    },
    { id: "e8g", pos: { x: 0, y: 2 }, active: false, behavior: "chase", kind: "ghost" },
  ],
};

// Room 9 — key-gate into a chase. A key-gate guarded by the harder subtle
// clue opens onto room 6's exact chase shape: an obvious-danger crate sitting
// in the only path, a chase enemy resting just behind its release point, and
// a straight run to the door. The payoff is doing the clue/key work correctly
// and then out-running the chase, back to back in one room.
const room9: RoomDef = {
  id: "room-9",
  width: 12,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 11, y: 2 },
  walls: wallsExcept(12, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
  ]),
  boxes: [
    {
      id: "b9gate",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e9guard",
    },
    {
      id: "b9chase",
      pos: { x: 8, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e9chase",
    },
  ],
  enemies: [
    // Stationary: a wall separates this gate from the chase pocket ahead, so
    // a chaser released here would still be trailing (shadowing the
    // player's own column) when the player needs to climb back up into that
    // next pocket — stepping straight onto it. Only the room's real, final
    // chase (below) gets to give chase.
    { id: "e9guard", pos: { x: 1, y: 1 }, active: false, behavior: "guard", kind: "ghost" },
    // Spawned on row 2 (not row 1, where the box sits) so it's already one
    // row below the release point when it wakes. The player is then forced
    // to descend onto that same row to reach the door — with only a 2-tile
    // gap, that descent lands exactly 1 tile from the enemy, which closes it
    // unavoidably next turn. 3 tiles clears it: the same margin e15's finale
    // chase uses for the same reason.
    { id: "e9chase", pos: { x: 5, y: 2 }, active: false, behavior: "chase", kind: "demon" },
  ],
  keys: [{ id: "k9", pos: { x: 2, y: 1 } }],
};

// Room 10 — the watched hall. First room where a triggered enemy roams the
// open main path instead of a side pocket: a two-row-tall hall (both rows
// floor, room 8's shape stretched out), with an obvious-danger crate near the
// start waking a patrol whose route spans most of the hall's length on one
// row. Because both rows are floor everywhere, the player can always dodge
// by shifting to the other row — a reaction, not a timing puzzle.
const room10: RoomDef = {
  id: "room-10",
  width: 11,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 10, y: 2 },
  walls: wallsExcept(11, 4, [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
  ]),
  boxes: [
    {
      id: "b10",
      pos: { x: 2, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e10",
    },
  ],
  enemies: [
    {
      id: "e10",
      pos: { x: 4, y: 1 },
      active: false,
      behavior: "patrol",
      kind: "skeleton",
      patrolRoute: [
        { x: 4, y: 1 },
        { x: 9, y: 1 },
      ],
    },
  ],
};

// Room 11 — three pockets, two keys, one decoy. Extends room 7's two-key
// idea with a third pocket that has no key and no enemy — just a plain
// crate — so a player who's learned "every pocket has a fight" gets a pocket
// that's genuinely nothing. Both real keys are still required for the door.
const room11: RoomDef = {
  id: "room-11",
  width: 16,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 15, y: 2 },
  walls: wallsExcept(16, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 12, y: 2 },
    { x: 13, y: 2 },
    { x: 14, y: 2 },
    { x: 15, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 11, y: 1 },
    { x: 12, y: 1 },
    { x: 13, y: 1 },
    { x: 14, y: 1 },
  ]),
  boxes: [
    {
      id: "b11a",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e11a",
    },
    {
      id: "b11b",
      pos: { x: 8, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e11b",
    },
    { id: "b11c", pos: { x: 12, y: 1 }, dangerous: false, clue: "none" },
  ],
  enemies: [
    // e11a stays a stationary guard: a wall separates its pocket from
    // pocket B ahead, so a chaser released here would still be trailing
    // right behind (shadowing the player's own column) when the player
    // climbs back up into pocket B — landing on it. e11b, the last
    // mandatory pocket before the door, is safe to give chase.
    { id: "e11a", pos: { x: 1, y: 1 }, active: false, behavior: "guard", kind: "slime" },
    { id: "e11b", pos: { x: 6, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
  ],
  keys: [
    { id: "k11a", pos: { x: 2, y: 1 } },
    { id: "k11b", pos: { x: 7, y: 1 } },
  ],
};

// Room 12 — there and back. First room where the door sits right beside
// spawn instead of at the far end: it's locked, and the only key is all the
// way across a long two-row hall. An obvious-danger crate sits in view along
// the direct row, tempting a patrol out of hiding — a cautious player can
// beeline via the other row and never wake it, but anyone who explores the
// straight line has to share both rows with a roaming skeleton on the way
// back too.
const room12: RoomDef = {
  id: "room-12",
  width: 11,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 0, y: 1 },
  walls: wallsExcept(11, 4, [
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
  ]),
  boxes: [
    {
      id: "b12",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e12",
    },
  ],
  enemies: [
    {
      id: "e12",
      pos: { x: 5, y: 1 },
      active: false,
      behavior: "patrol",
      kind: "skeleton",
      patrolRoute: [
        { x: 5, y: 1 },
        { x: 9, y: 1 },
      ],
    },
  ],
  keys: [{ id: "k12", pos: { x: 10, y: 1 } }],
};

// Room 13 — three keys, three styles. Widens room 7 again: three pockets,
// three keys, no decoys this time — one obvious clue behind a guard, one
// subtle clue behind a chaser (saved for last, since a wall separates every
// pocket here and a chaser released early would still be shadowing the
// player on the climb back into the next one), and one key just sitting in
// the open with no fight at all, the reward for having stopped expecting one
// every time.
const room13: RoomDef = {
  id: "room-13",
  width: 16,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 15, y: 2 },
  walls: wallsExcept(16, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 12, y: 2 },
    { x: 13, y: 2 },
    { x: 14, y: 2 },
    { x: 15, y: 2 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 11, y: 1 },
    { x: 12, y: 1 },
    { x: 13, y: 1 },
    { x: 14, y: 1 },
  ]),
  boxes: [
    {
      id: "b13a",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e13a",
    },
    {
      id: "b13b",
      pos: { x: 8, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e13b",
    },
  ],
  enemies: [
    { id: "e13a", pos: { x: 1, y: 1 }, active: false, behavior: "guard", kind: "slime" },
    { id: "e13b", pos: { x: 6, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
  ],
  keys: [
    { id: "k13a", pos: { x: 2, y: 1 } },
    { id: "k13b", pos: { x: 7, y: 1 } },
    { id: "k13c", pos: { x: 12, y: 1 } },
  ],
};

// Room 14 — the crowd. Room 5's NPC-hint idea, scaled up: a long row of
// near-identical crates (most safe, two subtly dangerous) with an NPC beside
// it whose lines narrow down which ones creak, and a key sitting openly in
// the crowd. A gap follows every crate so none of them can ever end up
// wedged unpushable between its neighbors, and a chase enemy rests well
// behind each dangerous one.
const room14: RoomDef = {
  id: "room-14",
  width: 19,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 18, y: 2 },
  intro: "So many crates. Someone was expecting company.",
  walls: wallsExcept(19, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 12, y: 2 },
    { x: 13, y: 2 },
    { x: 14, y: 2 },
    { x: 15, y: 2 },
    { x: 16, y: 2 },
    { x: 17, y: 2 },
    { x: 18, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 10, y: 1 },
    { x: 11, y: 1 },
    { x: 12, y: 1 },
    { x: 13, y: 1 },
    { x: 14, y: 1 },
    { x: 15, y: 1 },
    { x: 16, y: 1 },
    { x: 17, y: 1 },
  ]),
  boxes: [
    { id: "b14a", pos: { x: 3, y: 1 }, dangerous: false, clue: "none" },
    { id: "b14b", pos: { x: 5, y: 1 }, dangerous: false, clue: "none" },
    {
      id: "b14c",
      pos: { x: 7, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e14a",
    },
    { id: "b14d", pos: { x: 9, y: 1 }, dangerous: false, clue: "none" },
    { id: "b14e", pos: { x: 11, y: 1 }, dangerous: false, clue: "none" },
    {
      id: "b14f",
      pos: { x: 13, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e14b",
    },
  ],
  enemies: [
    { id: "e14a", pos: { x: 4, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
    { id: "e14b", pos: { x: 10, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
  ],
  keys: [{ id: "k14", pos: { x: 15, y: 1 } }],
  npc: {
    id: "npc14",
    pos: { x: 2, y: 1 },
    lines: [
      "This many crates, and my knees still ache just looking at them.",
      "Two of them creak different from the rest. Not the first two, not the last.",
      "The key's sitting right past the second one, if that's any help.",
    ],
  },
};

// Room 15 — finale: the gauntlet. Chains three things the player has now
// seen separately, back to back in one room: room 7's two-key pocket gate,
// room 10/12's roaming patrol across an open two-row hall, and room 6/9's
// exact chase-sprint shape at the very end. Clear the gate, dodge the
// patrol, then outrun the chase to the door.
const room15: RoomDef = {
  id: "room-15",
  width: 25,
  height: 4,
  playerStart: { x: 0, y: 2 },
  door: { x: 24, y: 2 },
  walls: wallsExcept(25, 4, [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 7, y: 2 },
    { x: 8, y: 2 },
    { x: 9, y: 2 },
    { x: 10, y: 2 },
    { x: 11, y: 2 },
    { x: 12, y: 2 },
    { x: 13, y: 2 },
    { x: 14, y: 2 },
    { x: 15, y: 2 },
    { x: 16, y: 2 },
    { x: 17, y: 2 },
    { x: 18, y: 2 },
    { x: 19, y: 2 },
    { x: 20, y: 2 },
    { x: 21, y: 2 },
    { x: 22, y: 2 },
    { x: 23, y: 2 },
    { x: 24, y: 2 },
    // pocket A (2-key gate)
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
    // pocket B (2-key gate)
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    // two-row hall, all the way through to the door: row 2 alone would let
    // the finale crate (b15c) get chain-pushed one cell short of the door
    // with no way around it, so row 1 stays open the whole rest of the way
    // and doubles as the escape route once the chase is loose.
    { x: 11, y: 1 },
    { x: 12, y: 1 },
    { x: 13, y: 1 },
    { x: 14, y: 1 },
    { x: 15, y: 1 },
    { x: 16, y: 1 },
    { x: 17, y: 1 },
    { x: 18, y: 1 },
    { x: 19, y: 1 },
    { x: 20, y: 1 },
    { x: 21, y: 1 },
    { x: 22, y: 1 },
    { x: 23, y: 1 },
    { x: 24, y: 1 },
  ]),
  boxes: [
    {
      id: "b15a",
      pos: { x: 3, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e15a",
    },
    {
      id: "b15b",
      pos: { x: 8, y: 1 },
      dangerous: true,
      clue: "subtle",
      releasesEnemyId: "e15b",
    },
    {
      id: "b15h",
      pos: { x: 12, y: 1 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e15h",
    },
    {
      id: "b15c",
      pos: { x: 19, y: 2 },
      dangerous: true,
      clue: "obvious",
      releasesEnemyId: "e15c",
    },
  ],
  enemies: [
    // e15a stays a stationary guard: a wall separates its pocket from
    // pocket B, so a chaser here would still be shadowing the player's
    // column when they climb back into B. e15b's pocket opens straight onto
    // the long unbroken hall the rest of the room runs through, so it's the
    // last "climb back up" moment in the room and safe to give chase.
    { id: "e15a", pos: { x: 1, y: 1 }, active: false, behavior: "guard", kind: "slime" },
    { id: "e15b", pos: { x: 6, y: 1 }, active: false, behavior: "chase", kind: "ghost" },
    {
      id: "e15h",
      pos: { x: 14, y: 1 },
      active: false,
      behavior: "patrol",
      kind: "skeleton",
      patrolRoute: [
        { x: 14, y: 1 },
        { x: 18, y: 1 },
      ],
    },
    // Spawned 3 tiles back from the crate's cell (matching room 9's chase
    // gap), not adjacent to it: a chase enemy resting right next to where the
    // triggering push lands the player closes that gap to zero on its very
    // first step, before the player can ever move again — an unavoidable,
    // instant loss every time. 3 tiles gives the player a turn of breathing
    // room, after which the gap holds steady for the rest of the sprint.
    { id: "e15c", pos: { x: 16, y: 2 }, active: false, behavior: "chase", kind: "demon" },
  ],
  keys: [
    { id: "k15a", pos: { x: 2, y: 1 } },
    { id: "k15b", pos: { x: 7, y: 1 } },
  ],
};

// The extent of a room's own floor, in its own (pre-close) coordinates.
function floorBounds(room: RoomDef): { minX: number; maxX: number; minY: number; maxY: number } {
  const isWall = new Set(room.walls.map((w) => `${w.x},${w.y}`));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      if (isWall.has(`${x},${y}`)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY };
}

// Wraps a hand-authored room in exactly one tile of wall on every side, adding
// a new ring only where the room's own floor actually reaches that edge. Most
// rooms already keep their floor a full row clear of y=0 and the last row —
// wallsExcept marks every untouched cell as wall, so that clearance is
// already a solid wall margin — and padding it again would leave a two-tile
// wall there while every other side is only one tile thick.
function closeRoom(room: RoomDef): RoomDef {
  const { minX, maxX, minY, maxY } = floorBounds(room);
  const padLeft = minX === 0 ? 1 : 0;
  const padRight = maxX === room.width - 1 ? 1 : 0;
  const padTop = minY === 0 ? 1 : 0;
  const padBottom = maxY === room.height - 1 ? 1 : 0;

  const width = room.width + padLeft + padRight;
  const height = room.height + padTop + padBottom;
  const shift = (v: Vec2): Vec2 => ({ x: v.x + padLeft, y: v.y + padTop });

  const wallKeys = new Set(room.walls.map(shift).map((w) => `${w.x},${w.y}`));
  for (let x = 0; x < width; x++) {
    wallKeys.add(`${x},0`);
    wallKeys.add(`${x},${height - 1}`);
  }
  for (let y = 0; y < height; y++) {
    wallKeys.add(`0,${y}`);
    wallKeys.add(`${width - 1},${y}`);
  }
  const walls: Vec2[] = [...wallKeys].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });

  return {
    ...room,
    width,
    height,
    walls,
    boxes: room.boxes.map((b) => ({ ...b, pos: shift(b.pos) })),
    enemies: room.enemies.map((e) => ({
      ...e,
      pos: shift(e.pos),
      patrolRoute: e.patrolRoute?.map(shift),
    })),
    npc: room.npc ? { ...room.npc, pos: shift(room.npc.pos) } : undefined,
    keys: room.keys?.map((k) => ({ ...k, pos: shift(k.pos) })),
    playerStart: shift(room.playerStart),
    door: shift(room.door),
  };
}

export const rooms: RoomDef[] = [
  room0,
  room1,
  room2,
  room3,
  room4,
  room5,
  room6,
  room7,
  room8,
  room9,
  room10,
  room11,
  room12,
  room13,
  room14,
  room15,
].map(closeRoom);
