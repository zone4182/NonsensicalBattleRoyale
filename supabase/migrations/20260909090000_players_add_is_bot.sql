-- Bot Mode (concept/bot-mode/BOT-MODE.md). A bot is a normal `role = 'player'` row --
-- same vote entitlements, same elimination logic -- flagged here rather than modeled as
-- a separate player_role, so every existing `requireRole(ctx, 'player')` check keeps
-- working unmodified. Bots still get a real (synthetic, pre-redeemed) invites row, since
-- players.invite_id stays a required FK.
alter table battle_royale.players
  add column is_bot boolean not null default false;
