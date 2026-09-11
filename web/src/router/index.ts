import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../stores/session";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
      meta: { auth: "public" },
    },
    {
      path: "/invite/:token?",
      name: "join",
      component: () => import("../views/JoinGameView.vue"),
      meta: { auth: "public" },
    },
    {
      path: "/prologue",
      name: "arrival-prologue",
      component: () => import("../views/ArrivalPrologueView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/game",
      name: "main-round",
      component: () => import("../views/MainRoundView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/game/vote",
      name: "private-vote",
      component: () => import("../components/modals/PrivateVoteModal.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/game/move",
      name: "move-to-room",
      component: () => import("../views/MoveToRoomView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/seance",
      name: "seance",
      component: () => import("../views/SeanceView.vue"),
      meta: { auth: "player", requiresGhost: true },
    },
    {
      path: "/three-doors",
      name: "three-doors",
      component: () => import("../views/ThreeDoorsView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/reveal",
      name: "end-game-reveal",
      component: () => import("../views/EndGameRevealView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/game-stats",
      name: "game-stats",
      component: () => import("../views/GameStatsView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/game-finished",
      name: "game-finished",
      component: () => import("../views/GameFinishedView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/helpline",
      name: "helpline",
      component: () => import("../views/HelplineView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/gm",
      component: () => import("../layouts/GmLayout.vue"),
      meta: { auth: "gm" },
      // Bare /gm has never had a route of its own -- redirect to whichever child
      // actually applies: the management hub if a GM session already exists (creating
      // a game and managing one are detached, so a GM who already created their game
      // has no business back in the wizard), otherwise the setup wizard.
      redirect: () => {
        const session = useSessionStore();
        return session.token && session.role === "gm" ? { name: "gm-in-play" } : { name: "gm-setup" };
      },
      children: [
        {
          path: "setup",
          name: "gm-setup",
          component: () => import("../views/gm/GmSetupView.vue"),
          // Creating a game happens before any invite token exists (gated server-side by the
          // setup secret instead, see create-game/index.ts), so this one screen must be
          // reachable without a session -- unlike the rest of the /gm nav.
          meta: { auth: "public" },
        },
        { path: "play", name: "gm-in-play", component: () => import("../views/gm/GmInPlayView.vue"), meta: { auth: "gm" } },
        {
          path: "helpline",
          name: "gm-helpline-inbox",
          component: () => import("../views/gm/GmHelplineInboxView.vue"),
          meta: { auth: "gm" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("../views/NotFoundView.vue"),
      meta: { auth: "public" },
    },
  ],
});

router.beforeEach((to) => {
  const session = useSessionStore();

  if (to.meta.auth === "public") return true;

  if (to.meta.auth === "player") {
    if (!session.token) return { name: "home" };
    return true;
  }

  if (to.meta.auth === "gm") {
    if (!session.token) return { name: "home" };
    if (session.role !== "gm") return { name: "main-round" };
    return true;
  }

  return true;
});

export default router;
