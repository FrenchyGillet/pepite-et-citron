import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      // Assets to precache alongside the generated SW manifest
      includeAssets: ["icon.svg", "icon-192x192.png", "icon-512x512.png"],

      // Inject the SW registration snippet into index.html automatically
      injectRegister: "auto",

      // ── Web App Manifest ────────────────────────────────────────────────────
      manifest: {
        name: "Pépite & Citron",
        short_name: "P&C",
        description:
          "Vote pour la pépite et le citron de chaque match — en quelques secondes, depuis le vestiaire.",
        lang: "fr",
        scope: "/",
        start_url: "/",
        display: "standalone",
        // Dark app → black chrome & splash background
        theme_color: "#000000",
        background_color: "#000000",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            // Separate maskable entry (safe zone guaranteed)
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },

      // ── Workbox (Service Worker) ────────────────────────────────────────────
      workbox: {
        // Precache all build output
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],

        // Never precache source maps
        globIgnores: ["**/*.map"],

        runtimeCaching: [
          // ── Supabase API → Network-first ───────────────────────────────────
          // Always try the network first so users see fresh data.
          // Falls back to cache when offline (up to 10 s timeout).
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 min
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Google Fonts / external fonts → Stale-While-Revalidate ─────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Static assets (images, SVG) → Cache-first ─────────────────────
          {
            urlPattern: /\.(?:png|jpe?g|gif|svg|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Silence dev-mode logs
      devOptions: {
        enabled: false, // SW disabled in `vite dev` — enable with `true` if needed
      },
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — almost never changes, longest cache life
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          // Server-state & client-state
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-zustand':  ['zustand'],
          // Supabase SDK — large but infrequently updated
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
    // Force demo mode for tests (avoids real Supabase)
    env: {
      VITE_SUPABASE_URL: "https://VOTRE_PROJET.supabase.co",
      VITE_SUPABASE_ANON_KEY: "VOTRE_CLE_ANON",
    },
  },
});
