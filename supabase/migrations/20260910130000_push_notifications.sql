-- Web Push (VAPID) subscriptions, one row per browser/device a player has enabled
-- notifications on (a player can have several -- phone + laptop, say). endpoint is
-- globally unique per the Push API's own guarantee, so re-subscribing (e.g. after
-- clearing site data) just replaces the old row for that same endpoint.
create table battle_royale.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references battle_royale.players (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_player_id_idx on battle_royale.push_subscriptions (player_id);

-- Marks a round as already having sent its "10% of voting time left" reminder, so the
-- every-5-minutes send-notifications sweep (see the schedule_send_notifications_cron
-- migration) never double-sends it.
alter table battle_royale.rounds
  add column deadline_reminder_sent_at timestamptz;
