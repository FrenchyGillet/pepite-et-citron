-- Migration : ajout des détails de souscription Stripe sur les organisations
-- Permet d'afficher la date d'expiration et de gérer la résiliation en fin de période.

ALTER TABLE organizations
  -- Fin de la période en cours (renouvellement ou expiration après résiliation)
  ADD COLUMN IF NOT EXISTS current_period_end    timestamptz,
  -- true si l'utilisateur a demandé l'annulation (mais accès conservé jusqu'à current_period_end)
  ADD COLUMN IF NOT EXISTS cancel_at_period_end  boolean NOT NULL DEFAULT false,
  -- Horodatage du dernier échec de paiement (pour alertes futures)
  ADD COLUMN IF NOT EXISTS last_payment_failed_at timestamptz;
