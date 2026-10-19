/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const pkg = createRequire(import.meta.url)("./package.json") as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
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
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
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
    !!process.env.ANALYZE &&
      visualizer({ filename: "dist/stats.html", gzipSize: true }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("dexie")) return "dexie";
        },
      },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { host: true },
  preview: { host: true },
  test: {
    environment: "jsdom",
    setupFiles: "src/test/setup.ts",
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
  },
});
