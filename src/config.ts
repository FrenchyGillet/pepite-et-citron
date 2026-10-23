export const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || "https://VOTRE_PROJET.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "VOTRE_CLE_ANON";

/** VAPID public key for Web Push (optional — push disabled when absent) */
export const VAPID_PUBLIC_KEY  = import.meta.env.VITE_VAPID_PUBLIC_KEY  || "";

/** Stripe Payment Link for tips ("Soutenir l'app" in Profile) — card hidden when absent */
export const SUPPORT_URL       = import.meta.env.VITE_SUPPORT_URL       || "";
