import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: false,
    // Force le mode démo pour les tests (évite d'utiliser le vrai Supabase)
    env: {
      VITE_SUPABASE_URL:      "https://VOTRE_PROJET.supabase.co",
      VITE_SUPABASE_ANON_KEY: "VOTRE_CLE_ANON",
    },
  },
});
