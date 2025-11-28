# Achievements Service

  Proposed DTOs

  - AchievementDto: { code, name, description, category, icon, unlockType, criteria?: [...], sortOrder } (criteria optional for client hints).
  - UserAchievementDto: { code, unlockedAt, progressValue?, progressDetail?, notifiedAt?, name, description, category, icon } (flattened join).
  - AchievementsResponse: { unlocked: UserAchievementDto[], locked: AchievementDto[] }.
  - EvaluateResultDto: { newlyUnlocked: UserAchievementDto[], alreadyUnlocked: string[] } to drive toasts after a game ends.
  - ProfileDto augmentation: { stats: UserStatsDto, achievements: AchievementsResponse }.

  API/controller sketch (HTTP)

  - GET /users/:userId/achievements: read-only list (locked + unlocked). Auth: self or admin.
  - POST /users/:userId/achievements/unlock: run evaluator after stats update; returns EvaluateResultDto. Called from game-end pipeline only.
  - GET /users/:userId/profile: existing/combined profile with stats + achievements (optional).

  Service/repo layering

  - Repository interfaces for achievements, achievement_criteria, user_achievements.
  - Evaluator/unlock service: given userStats, compute eligible achievements, upsert new unlocks (idempotent), return delta.
  - Controller uses service; client uses HTTP. Mock repos for unit tests; integration tests can use in-memory SQLite if desired.

  Transport choice

  - HTTP is fine: unlocks happen at game end and can piggyback on the game-end/stats-update flow. Websocket is only needed for push to the in-game UI; you can still trigger a toast client-
    side after the HTTP evaluate response (or emit a notification event if you already have a channel). So: evaluate via HTTP, optionally push via existing notification mechanism for live
    sessions.

  Other changes to support this feature

  - Hook game-end flow to call stats update then POST /users/:id/achievements/unlock.
  - Ensure user_stats includes data needed for per-game achievements; if not, enrich game_history/game_participants or supply derived metrics to evaluator.
  - Seed the achievements catalog on startup (idempotent) so environments are consistent.
  - Reuse existing authentication/authorization middleware on the new routes (self-or-admin for user-scoped reads/writes).
  - Tests: table-driven evaluator unit tests (thresholds, ratios, streaks), repo tests for uniqueness/idempotency, controller tests for auth and response shapes.
