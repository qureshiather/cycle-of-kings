-- Supabase auth columns on players (safe for existing rows; does not truncate).
-- Run via: pnpm --filter @workspace/db run apply:supabase-auth

ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  ALTER TABLE players ADD CONSTRAINT players_auth_user_id_unique UNIQUE (auth_user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE players ALTER COLUMN device_id DROP NOT NULL;
