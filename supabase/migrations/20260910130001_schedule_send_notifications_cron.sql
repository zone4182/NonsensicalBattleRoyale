-- Same pattern as battle-royale-resolve-round/battle-royale-resolve-doors: every 5
-- minutes, unscoped, secret pulled from Vault at execution time. This is what catches
-- the "10% of voting time left" deadline reminder -- round-started notifications are
-- sent directly by start-round/redeem-invite/resolve-round instead, since that's a
-- discrete event those functions already know the moment it happens.
select cron.schedule(
  'battle-royale-send-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zmwsmxulcbhwjvnyvihb.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'battle_royale_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
