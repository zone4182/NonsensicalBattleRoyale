import { defineStore } from "pinia";
import { ref, watch } from "vue";

export type PlayerRole = "player" | "gm";

const STORAGE_KEY = "nbr.session";

interface StoredSession {
  token: string | null;
  role: PlayerRole | null;
  playerId: string | null;
  gameId: string | null;
  displayName: string | null;
}

function loadStoredSession(): StoredSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no stored session");
    return JSON.parse(raw) as StoredSession;
  } catch {
    return { token: null, role: null, playerId: null, gameId: null, displayName: null };
  }
}

// Identity for this game is a per-person invite token, sent as a bearer credential on
// every Edge Function call (ARCHITECTURE.md "Auth/identity") -- there is no Supabase
// Auth session to sync here, just this token.
export const useSessionStore = defineStore("session", () => {
  const initial = loadStoredSession();

  const token = ref<string | null>(initial.token);
  const role = ref<PlayerRole | null>(initial.role);
  const playerId = ref<string | null>(initial.playerId);
  const gameId = ref<string | null>(initial.gameId);
  const displayName = ref<string | null>(initial.displayName);

  watch([token, role, playerId, gameId, displayName], () => {
    const snapshot: StoredSession = {
      token: token.value,
      role: role.value,
      playerId: playerId.value,
      gameId: gameId.value,
      displayName: displayName.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  });

  function setSession(session: StoredSession) {
    token.value = session.token;
    role.value = session.role;
    playerId.value = session.playerId;
    gameId.value = session.gameId;
    displayName.value = session.displayName;
  }

  function clearSession() {
    setSession({ token: null, role: null, playerId: null, gameId: null, displayName: null });
  }

  return { token, role, playerId, gameId, displayName, setSession, clearSession };
});
