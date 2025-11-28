import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { achievementsCatalog, syncAchievementCatalog } from '../server/src/data/achievementsCatalog';
import { DatabaseConnection } from '../server/src/infrastructure/database';
import { SqliteAchievementRepository } from '../server/src/repositories/achievementRepository';
import { SqliteUserRepository } from '../server/src/repositories/userRepository';
import { AchievementService } from '../server/src/services/achievementService';
import { UserService } from '../server/src/services/userService';

describe('Achievement Service with test DB', () => {
  const TEST_DB_PATH = path.join(__dirname, '../server/data/splendor-test.db');
  const baseUserId = 'user-sqlite';
  let userId: string;
  let db: DatabaseConnection;
  let achievementRepo: SqliteAchievementRepository;
  let achievementService: AchievementService;
  let userRepo: SqliteUserRepository;
  let userService: UserService;

  beforeEach(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = DatabaseConnection.createAtPath(TEST_DB_PATH);
    syncAchievementCatalog(db);
    userRepo = new SqliteUserRepository(db);
    userService = new UserService(userRepo);
    const createdUser = await userService.registerUser(`${baseUserId}-name`, `${baseUserId}@example.com`, 'password123');
    userId = createdUser.id;
    achievementRepo = new SqliteAchievementRepository(db);
    achievementService = new AchievementService(achievementRepo);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('unlocks and persists achievements', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 25,
      gamesWon: 15,
      totalCardsPurchased: 55,
      totalNoblesAcquired: 12,
      fastestWinTime: 700,
      highestPrestigeScore: 19,
      totalPrestigePoints: 210,
      favoriteGemType: 'sapphire',
    });

    const result = await achievementService.evaluateUserAchievements(userId);
    const codes = new Set(result.newlyUnlocked.map((a) => a.code));
    const expected = new Set([
      'first_game',
      'first_win',
      'marathon_20',
      'card_collector',
      'winner_10',
      'prestige_hunter',
      'prestige_hoarder',
      'speedrunner',
      'noble_courtier',
      'gem_specialist',
      'consistent_winner',
    ]);

    expect(codes).toEqual(expected);
    // Verify user_achievements rows persisted for every expected unlock.
    const persistedRows = db.query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
    expect(persistedRows).toHaveLength(expected.size);
  });

  it('repository returns catalog with attached criteria', () => {
    const achievements = achievementRepo.getAchievementsWithCriteria();
    expect(achievements.length).toBeGreaterThan(0);
    expect(achievements.some((a) => (a.criteria || []).length > 0)).toBe(true);
    const firstWithCriteria = achievements.find((a) => (a.criteria || []).length > 0);
    expect(firstWithCriteria?.criteria[0].stat_key).toBeTruthy();
  });

  it('insertUserAchievement ignores duplicates for same user/achievement', () => {
    const achievementId = db.get('SELECT id FROM achievements LIMIT 1')?.id as number;
    const now = Date.now();
    achievementRepo.insertUserAchievement({
      userId,
      achievementId,
      unlockedAt: now,
      progressValue: 1,
    });
    achievementRepo.insertUserAchievement({
      userId,
      achievementId,
      unlockedAt: now + 1,
      progressValue: 2,
    });
    // Confirm only one row exists for the user/achievement pair.
    const rows = db.query('SELECT * FROM user_achievements WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].progress_value).toBe(1);
  });

  it('persists progress_value for ratio achievements', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 20,
      gamesWon: 12,
      totalCardsPurchased: 5,
      totalNoblesAcquired: 1,
      highestPrestigeScore: 10,
      totalPrestigePoints: 50,
    });

    await achievementService.evaluateUserAchievements(userId);
    // Read stored progress_value for consistent_winner.
    const consistentWinnerId = db.get('SELECT id FROM achievements WHERE code = ?', ['consistent_winner'])?.id;
    expect(consistentWinnerId).toBeTruthy();
    const ua = db.get(
      'SELECT progress_value FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, consistentWinnerId]
    );
    expect(ua?.progress_value).toBeCloseTo(0.6, 5);
  });

  it('keeps a single row and preserves original progress on repeated evaluations', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 20,
      gamesWon: 12,
      totalCardsPurchased: 5,
      totalNoblesAcquired: 1,
      highestPrestigeScore: 10,
      totalPrestigePoints: 50,
    });
    await achievementService.evaluateUserAchievements(userId);
    // Capture initial stored progress.
    const initial = db.get(
      `SELECT progress_value FROM user_achievements WHERE user_id = ?
       AND achievement_id = (SELECT id FROM achievements WHERE code = 'consistent_winner')`,
      [userId]
    );
    await userService.updateUserStats(userId, {
      gamesPlayed: 5,
      gamesWon: 5,
      totalCardsPurchased: 0,
      totalNoblesAcquired: 0,
      highestPrestigeScore: 0,
      totalPrestigePoints: 0,
      fastestWinTime: 400,
      favoriteGemType: 'emerald',
    });
    const rerun = await achievementService.evaluateUserAchievements(userId);
    // Ensure only one row exists for consistent_winner after re-evaluation.
    const consistentWinnerId = db.get('SELECT id FROM achievements WHERE code = ?', ['consistent_winner'])?.id;
    const cwRows = db.query(
      'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, consistentWinnerId]
    );
    expect(cwRows).toHaveLength(1);
    const post = db.get(
      `SELECT progress_value FROM user_achievements WHERE user_id = ?
       AND achievement_id = (SELECT id FROM achievements WHERE code = 'consistent_winner')`,
      [userId]
    );
    expect(post?.progress_value).toBeCloseTo(initial?.progress_value, 5);
    expect(rerun.alreadyUnlocked).toContain('consistent_winner');
  });

  it('does not persist partial state when achievement validation fails', async () => {
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO achievements (code, name, description, category, icon, sort_order, unlock_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['broken', '', 'bad', 'meta', null, 999, 'threshold', now, now]
    );
    db.run(
      `INSERT INTO achievement_criteria (achievement_id, stat_key, comparator, target_value)
       VALUES ((SELECT id FROM achievements WHERE code = ?), ?, ?, ?)`,
      ['broken', 'games_played', '>=', 1]
    );

    await userService.updateUserStats(userId, {
      gamesPlayed: 25,
      gamesWon: 15,
      totalCardsPurchased: 55,
      totalNoblesAcquired: 12,
      fastestWinTime: 700,
      highestPrestigeScore: 19,
      totalPrestigePoints: 210,
      favoriteGemType: 'sapphire',
    });

    await expect(achievementService.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid achievement configuration/);
    // Ensure no user_achievements rows were written on failure.
    const rows = db.query('SELECT * FROM user_achievements WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(0);
  });

  it('keeps achievements isolated per user', async () => {
    const otherUser = await userService.registerUser('other-name', 'other@example.com', 'password123');
    await userService.updateUserStats(userId, {
      gamesPlayed: 25,
      gamesWon: 15,
      totalCardsPurchased: 55,
      totalNoblesAcquired: 12,
      fastestWinTime: 700,
      highestPrestigeScore: 19,
      totalPrestigePoints: 210,
      favoriteGemType: 'sapphire',
    });
    await achievementService.evaluateUserAchievements(userId);
    const otherResult = await achievementService.evaluateUserAchievements(otherUser.id);

    // Verify only the first user has stored unlocks.
    const userRows = db.query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
    const otherRows = db.query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [otherUser.id]);
    expect(userRows.length).toBeGreaterThan(0);
    expect(otherRows).toHaveLength(0);
    expect(otherResult.newlyUnlocked).toHaveLength(0);
  });

  it('seeds catalog with unique codes and expected criteria counts', () => {
    // Pull all achievements with their criteria counts from DB.
    const rows = db.query(
      `SELECT a.code, COUNT(ac.id) as critCount
       FROM achievements a
       LEFT JOIN achievement_criteria ac ON ac.achievement_id = a.id
       GROUP BY a.id`
    );
    expect(rows).toHaveLength(achievementsCatalog.length);
    const codes = new Set(rows.map((r: any) => r.code));
    expect(codes.size).toBe(achievementsCatalog.length);
    const expectedCounts = new Map(achievementsCatalog.map((a) => [a.code, a.criteria.length]));
    rows.forEach((row: any) => {
      expect(row.critCount).toBe(expectedCounts.get(row.code));
    });
  });

  it('supports incremental stat updates across evaluations', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 1,
      gamesWon: 1,
      totalCardsPurchased: 1,
      totalNoblesAcquired: 0,
      fastestWinTime: 1200,
      highestPrestigeScore: 12,
      totalPrestigePoints: 15,
      favoriteGemType: 'ruby',
    });
    const firstPass = await achievementService.evaluateUserAchievements(userId);
    expect(firstPass.newlyUnlocked.map((a) => a.code)).toEqual(expect.arrayContaining(['first_game', 'first_win']));

    await userService.updateUserStats(userId, {
      gamesPlayed: 19,
      gamesWon: 11,
      totalCardsPurchased: 60,
      totalNoblesAcquired: 12,
      fastestWinTime: 700,
      highestPrestigeScore: 19,
      totalPrestigePoints: 210,
      favoriteGemType: 'ruby',
    });
    const secondPass = await achievementService.evaluateUserAchievements(userId);
    // Confirm incremental unlocks now present.
    const codes = secondPass.newlyUnlocked.map((a) => a.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'marathon_20',
        'winner_10',
        'card_collector',
        'prestige_hunter',
        'prestige_hoarder',
        'noble_courtier',
        'speedrunner',
        'gem_specialist',
        'consistent_winner',
      ])
    );
  });

  it('returns locked and unlocked achievements through getUserAchievements', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 20,
      gamesWon: 10,
      totalCardsPurchased: 55,
      totalNoblesAcquired: 10,
      fastestWinTime: 800,
      highestPrestigeScore: 18,
      totalPrestigePoints: 210,
      favoriteGemType: 'emerald',
    });
    const evalResult = await achievementService.evaluateUserAchievements(userId);
    const response = await achievementService.getUserAchievements(userId);
    const unlockedCodes = new Set(response.unlocked.map((a) => a.code));
    expect(unlockedCodes).toEqual(new Set(evalResult.newlyUnlocked.map((a) => a.code)));
    // Locked + unlocked counts should equal catalog size.
    expect(response.locked.length + response.unlocked.length).toBe(achievementsCatalog.length);
  });

  it('persists ratio progress with higher precision', async () => {
    await userService.updateUserStats(userId, {
      gamesPlayed: 28,
      gamesWon: 17,
      totalCardsPurchased: 0,
      totalNoblesAcquired: 0,
      fastestWinTime: 0,
      highestPrestigeScore: 0,
      totalPrestigePoints: 0,
      favoriteGemType: 'ruby',
    });
    await achievementService.evaluateUserAchievements(userId);
    // Read stored high-precision ratio value.
    const row = db.get(
      `SELECT progress_value FROM user_achievements WHERE user_id = ?
       AND achievement_id = (SELECT id FROM achievements WHERE code = 'consistent_winner')`,
      [userId]
    );
    expect(row?.progress_value).toBeCloseTo(17 / 28, 7);
  });

  it('does not write user_achievements when user stats are missing', async () => {
    const missingUserId = 'no-stats-user';
    await expect(achievementService.evaluateUserAchievements(missingUserId)).rejects.toThrow(/User stats not found/);
    const rows = db.query('SELECT * FROM user_achievements WHERE user_id = ?', [missingUserId]);
    expect(rows).toHaveLength(0);
  });
});
