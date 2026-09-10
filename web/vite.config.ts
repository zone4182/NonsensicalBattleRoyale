import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // injectManifest (a custom service worker source we write ourselves, see
      // src/sw.ts) instead of the default generateSW -- Web Push needs its own
      // `push`/`notificationclick` listeners, which generateSW's fully-generated
      // service worker has no hook for.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Nonsensical Battle Royale",
        short_name: "NBR",
        description: "A social-deduction party game.",
        theme_color: "#0d0d0d",
        background_color: "#0d0d0d",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
});
