/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.HOST || "localhost";
  return {
    plugins: [
      basicSsl(),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "Route Points",
          short_name: "RoutePts",
          theme_color: "#1e3a5f",
          background_color: "#1e3a5f",
          display: "standalone",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "osm-tiles",
                expiration: {
                  maxEntries: 4000,
                  maxAgeSeconds: 7 * 24 * 60 * 60,
                },
              },
            },
            {
              urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "esri-tiles",
                expiration: {
                  maxEntries: 4000,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { host },
    preview: { host },
    test: {
      environment: "jsdom",
      setupFiles: "src/test/setup.ts",
      globals: true,
      exclude: ["e2e/**", "node_modules/**"],
    },
  };
});
