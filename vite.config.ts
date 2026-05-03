import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      // ── injectManifest: use our own SW (src/sw.ts) for push support ─────────
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",

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

      // injectManifest mode: Workbox config passed to the injection step
      injectManifest: {
        // Precache all build output
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        globIgnores:  ["**/*.map"],
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
