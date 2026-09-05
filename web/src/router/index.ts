import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "../stores/session";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/invite" },
    {
      path: "/invite/:token?",
      name: "landing",
      component: () => import("../views/LandingView.vue"),
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
      path: "/helpline",
      name: "helpline",
      component: () => import("../views/HelplineView.vue"),
      meta: { auth: "player" },
    },
    {
      path: "/gm",
      component: () => import("../layouts/GmLayout.vue"),
      meta: { auth: "gm" },
      children: [
        { path: "setup", name: "gm-setup", component: () => import("../views/gm/GmSetupView.vue"), meta: { auth: "gm" } },
        { path: "play", name: "gm-in-play", component: () => import("../views/gm/GmInPlayView.vue"), meta: { auth: "gm" } },
        {
          path: "invites",
          name: "gm-invites",
          component: () => import("../views/gm/GmInvitesView.vue"),
          meta: { auth: "gm" },
        },
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
    if (!session.token) return { name: "landing" };
    return true;
  }

  if (to.meta.auth === "gm") {
    if (!session.token) return { name: "landing" };
    if (session.role !== "gm") return { name: "main-round" };
    return true;
  }

  return true;
});

export default router;
