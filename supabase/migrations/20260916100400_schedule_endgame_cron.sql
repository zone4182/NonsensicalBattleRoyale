-- Deadline-fallback sweeps for the two new endgame mechanisms (see
-- concept/mini-games/russian-roulette-endgame.md) -- same pattern as
-- battle-royale-resolve-doors: every 5 minutes, unscoped, secret pulled from Vault at
-- execution time by name.
select cron.schedule(
  'battle-royale-resolve-endgame-transition',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zmwsmxulcbhwjvnyvihb.supabase.co/functions/v1/resolve-endgame-transition',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'battle_royale_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'battle-royale-resolve-roulette-timeouts',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zmwsmxulcbhwjvnyvihb.supabase.co/functions/v1/resolve-roulette-timeouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'battle_royale_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
