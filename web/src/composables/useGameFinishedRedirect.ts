import { watch } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "../stores/game";

// The GM's "Finish game" is an administrative close, independent of game.phase (see
// finish-game/index.ts) -- a player sitting on any actively-polling screen (main round,
// vote, Three Doors, Move-to-Room) needs to notice this even if phase itself never
// naturally reached 'ended'. Call this once from each such screen's <script setup>; it
// watches the store's own gameFinished flag (populated by that screen's existing
// game.refresh() calls) and redirects the moment it flips true. gameFinished starts
// false on every fresh store (a full reload), so the false->true transition this relies
// on always fires -- no need for an immediate check on top of it.
export function useGameFinishedRedirect(): void {
  const game = useGameStore();
  const router = useRouter();

  watch(
    () => game.gameFinished,
    (finished) => {
      if (finished) router.push({ name: "game-finished" });
    },
  );
}
