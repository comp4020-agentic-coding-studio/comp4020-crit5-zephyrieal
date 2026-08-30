# Process overview

A reading-guide to how Descent came together.

## What I built

Descent is a turn-based dungeon-escape game across 16 rooms. Pushing a crate
sometimes releases an enemy — a guard that holds its ground, a chaser that
pursues, or a patrol pacing a fixed route — and every dangerous crate carries
an obvious or subtle visual clue before you touch it. Keys, an NPC with
dialogue, and a locked door round out the mechanics. There's no on-screen
instruction anywhere: the crit's brief is "no tutorials", so the affordances
(a crate creaking, an enemy sprite, a locked-door glow) have to teach the rules
by themselves.

## The moments that mattered

1. **The engine is a pure reducer, on purpose.** `step(room, state, action) ->
   state` in `src/game/engine.ts` holds every rule — movement, box-pushing,
   enemy resolution, loss/win — and never touches the DOM; `render.ts` only
   reads state back out. The obvious shortcut was to fold enemy movement into
   the same code that updates the screen. Keeping them apart is what let a
   test file drive full playthroughs later with no browser involved.
   [`bc94c23`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-zephyrieal/commit/bc94c23)

2. **Room 15's finale bug was found by reading the engine's turn order, not
   by replaying the room until it broke.** A crate could be pushed into a
   position that either soft-locked the level or made the following catch
   unavoidable, depending on push order. `checkLoss` runs *after*
   `resolveEnemies` and *before* `checkWin` — so even a move onto the door
   tile isn't automatically safe if an enemy's post-move position lands on
   the player first. Tracing that ordering by hand against the room's exact
   layout, rather than trial-and-error playtesting, is what found the fix.
   [`da8d4de`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-zephyrieal/commit/da8d4de)

3. **Converting stationary guards into chasers was checked by scripted
   playthroughs of the real engine, not by eyeballing ten rooms.** I wrote a
   temporary vitest file that imports the actual `rooms` and `step`, scripts
   a full move sequence per room, and asserts `phase === "won"`. That harness
   is what caught a genuine bug — room 9's chase enemy spawned only 2 tiles
   from its release box on a different row, which made the player's forced
   next move land exactly 1 tile away and guaranteed a catch — rather than me
   shipping a change I'd only reasoned through on paper. Two of my own test
   sequences also failed first (an off-by-one from misreading `closeRoom`'s
   edge-conditional padding, and a crate chain-pushed onto the door's own
   push-target), which is exactly the kind of thing hand-tracing misses and a
   real engine run doesn't.
   [`d92221a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-zephyrieal/commit/d92221a)

4. **The subtitle came out because the brief says so, not because it read
   badly.** The page had a visible line spelling out the mechanic in plain
   English ("...pushing crates and reading the room"). `spec/crit-5.test.ts`
   encodes the brief's "no tutorials" line as a real check (no
   how-to-play/instructions copy anywhere in the built page); cutting the
   subtitle entirely rather than softening it is what that contract actually
   asks for.
   [`a456bdb`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-zephyrieal/commit/a456bdb)

## Before you ship

`pnpm check` is green (typecheck, build, and both `spec/invariants.test.ts`
and `spec/crit-5.test.ts`) as of the commits cited above.
