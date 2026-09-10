import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useSessionStore } from "./stores/session";
import { i18n } from "./i18n";
import "./styles/base.css";
// Side-effect import only: registers the beforeinstallprompt/appinstalled listeners at
// module scope. Must happen here, at boot, not wait for whatever component first calls
// useInstallPrompt() -- that's HomeView.vue, which the router lazy-loads as its own
// chunk. beforeinstallprompt fires once, early, with no replay if nothing's listening
// yet; on a slow connection that chunk can easily still be downloading when it fires,
// permanently missing it for that page load (desktop dev testing rarely hits this --
// the chunk loads fast enough to usually win the race).
import "./composables/useInstallPrompt";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);

// Dev-only escape hatch so the skeleton is navigable without a backend: visiting
// ?dev=player or ?dev=gm fakes a session. Never active in a production build.
if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  const devRole = params.get("dev");
  if (devRole === "player" || devRole === "gm") {
    const session = useSessionStore();
    session.setSession({
      token: `dev-${devRole}-token`,
      role: devRole,
      playerId: "dev-player-id",
      gameId: "dev-game-id",
      displayName: devRole === "gm" ? "Bart" : "Dev Player",
    });
  }
}

app.mount("#app");
