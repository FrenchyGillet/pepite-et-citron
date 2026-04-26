-- Migration : ajout du plan freemium sur les organisations
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan               text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id      text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  text;

-- Index pour le webhook (recherche par subscription_id)
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id
  ON organizations (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- RLS : le service role (webhook Stripe) peut tout mettre à jour
-- (les policies existantes pour les admins couvrent déjà la lecture)
-- Aucune policy supplémentaire nécessaire si le webhook utilise la service role key.
