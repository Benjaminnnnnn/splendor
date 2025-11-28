-- Seed test data for user "test 2" (email: test2@gmail.com) to unlock several achievements.
-- Run this against the SQLite DB (server/data/splendor.db) before hitting
-- POST /api/users/:userId/achievements/evaluate and loading the Profile page.

-- 1) Ensure the user exists.
INSERT OR IGNORE INTO users (id, username, email, password_hash, created_at, last_login)
VALUES (
  'test2',
  'test 2',
  'test2@gmail.com',
  'TEST_HASH_ONLY_FOR_LOCAL_DEV', -- replace with a real hash if needed
  strftime('%s','now'),
  strftime('%s','now')
);

-- 2) Ensure a user_stats row exists for this user (no-op if it already exists).
INSERT INTO user_stats (user_id, games_played, games_won, total_prestige_points, total_cards_purchased, total_nobles_acquired, fastest_win_time, highest_prestige_score, favorite_gem_type, created_at, updated_at)
SELECT
  id,
  0, 0, 0, 0, 0, NULL, 0, NULL,
  strftime('%s','now'),
  strftime('%s','now')
FROM users u
WHERE u.email = 'test2@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM user_stats s WHERE s.user_id = u.id);

-- 3) Set stats high enough to trigger multiple unlocks (wins, marathon, cards, nobles, prestige, speed).
UPDATE user_stats
SET
  games_played = 25,
  games_won = 12,
  total_prestige_points = 250,
  total_cards_purchased = 120,
  total_nobles_acquired = 15,
  fastest_win_time = 550,          -- under 10 minutes
  highest_prestige_score = 20,
  favorite_gem_type = 'sapphire',
  updated_at = strftime('%s','now')
WHERE user_id = (SELECT id FROM users WHERE email = 'test2@gmail.com');

-- After running this script, call:
--   POST /api/users/test2/achievements/evaluate
-- to persist the unlocks, then view the Profile page as "test 2".
