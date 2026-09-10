import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useSessionStore } from "./stores/session";
import { i18n } from "./i18n";
import "./styles/base.css";

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
