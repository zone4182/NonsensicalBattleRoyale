-- Every minute was overkill for how often a deadline actually passes -- every 5
-- minutes cuts Edge Function invocation volume ~5x while still keeping automatic-mode
-- games resolving promptly. cron.schedule() with an existing job name updates it in
-- place rather than creating a duplicate.
select cron.schedule(
  'battle-royale-resolve-round',
  '*/5 * * * *',
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
