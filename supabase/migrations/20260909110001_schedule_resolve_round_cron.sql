-- Automatic round resolution (GM setup "round_resolution_mode = automatic"). Runs every
-- minute, unscoped -- resolve-round itself only actually resolves rounds belonging to a
-- game with round_resolution_mode = 'automatic' whose deadline has passed (see
-- resolve-round/index.ts), so a 'manual' game is untouched by this even though the cron
-- fires for every game. The secret is pulled from Vault at execution time by name --
-- never hardcoded here, so it stays safe to commit. Project URL is not a secret.
select cron.schedule(
  'battle-royale-resolve-round',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://zmwsmxulcbhwjvnyvihb.supabase.co/functions/v1/resolve-round',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'battle_royale_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
