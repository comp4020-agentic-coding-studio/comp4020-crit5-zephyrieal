import { createGameState, nextRoom, step } from "../game/engine";
import { actionForKey, bindKeydown } from "../game/input";
import { renderDialogue, renderOutcome, renderRoom } from "../game/render";
import { rooms } from "../game/rooms";
import type { GameState } from "../game/types";

const root = document.getElementById("game-root");
const outcome = document.getElementById("outcome");
const dialogue = document.getElementById("dialogue");

if (root && outcome && dialogue) {
  let roomIndex = 0;
  let state: GameState = createGameState(rooms[roomIndex], roomIndex);

  const render = () => {
    renderRoom(root, rooms[roomIndex], state);
    renderOutcome(outcome, state, roomIndex === rooms.length - 1);
    renderDialogue(dialogue, rooms[roomIndex], state);
  };

  render();

  bindKeydown((key) => {
    if (state.phase === "lost") {
      state = step(rooms[roomIndex], state, { type: "restart" });
      render();
      return;
    }

    if (state.phase === "won") {
      if (roomIndex < rooms.length - 1) {
        roomIndex += 1;
        state = createGameState(rooms[roomIndex], roomIndex);
        render();
      }
      return;
    }

    const action = actionForKey(key);
    if (!action) return;
    state = step(rooms[roomIndex], state, action);
    render();
  });
}

// keeps `nextRoom` reachable for anyone reading the reducer's public surface
// even though this wiring advances rooms directly above.
void nextRoom;
