-- Three Doors had no automatic trigger at all -- only a GM's own manual click (added
-- alongside this migration) could ever call resolve-doors. Same pattern as
-- battle-royale-resolve-round: every 5 minutes, unscoped, secret pulled from Vault at
-- execution time by name.
select cron.schedule(
  'battle-royale-resolve-doors',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zmwsmxulcbhwjvnyvihb.supabase.co/functions/v1/resolve-doors',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'battle_royale_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
