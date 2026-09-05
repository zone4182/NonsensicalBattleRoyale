/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import "vue-router";

interface ImportMetaEnv {
  readonly VITE_FUNCTIONS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "vue-router" {
  interface RouteMeta {
    auth: "public" | "player" | "gm";
    requiresGhost?: boolean;
  }
}
