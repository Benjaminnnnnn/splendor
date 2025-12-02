import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { AchievementService } from '../server/src/services/achievementService';
import {
  FakeAchievementRepository,
  buildUserStats,
  makeRatioAchievement,
  makeThresholdAchievement,
} from './achievementTestUtils';

const userId = 'user-prop';

const statsArbitrary = fc
  .record({
    games_played: fc.integer({ min: 1, max: 200 }),
    games_won: fc.integer({ min: 0, max: 200 }),
    total_prestige_points: fc.integer({ min: 0, max: 500 }),
    total_cards_purchased: fc.integer({ min: 0, max: 200 }),
    total_nobles_acquired: fc.integer({ min: 0, max: 50 }),
    fastest_win_time: fc.integer({ min: 0, max: 5000 }),
    highest_prestige_score: fc.integer({ min: 0, max: 50 }),
  })
  .map((stats) => ({
    ...stats,
    games_won: Math.min(stats.games_won, stats.games_played),
  }))
  .map((stats) => buildUserStats({ ...stats, user_id: userId }));

describe('Achievement Service property tests', () => {
  it('does not duplicate unlocks when evaluated repeatedly on the same stats', async () => {
    const achievements = [
      makeThresholdAchievement(1, 'marathon', 'games_played', '>=', 10),
      makeRatioAchievement(2, 'win_rate', 'games_won', 'games_played', 0.5, 2),
    ];

    await fc.assert(
      fc.asyncProperty(statsArbitrary, async (stats) => {
        const repo = new FakeAchievementRepository();
        repo.achievements = achievements;
        repo.setUserStats(userId, stats);
        const service = new AchievementService(repo);

        const first = await service.evaluateUserAchievements(userId);
        const second = await service.evaluateUserAchievements(userId);

        const unlockedRows = repo.getUserAchievements(userId);
        const uniqueCodes = new Set(first.newlyUnlocked.map((a) => a.code));

        expect(unlockedRows.length).toBe(uniqueCodes.size);
        expect(second.newlyUnlocked.length).toBe(0);
        expect(new Set(second.alreadyUnlocked)).toEqual(uniqueCodes);
      }),
      { numRuns: 50 }
    );
  });

  it('unlocks a non-decreasing set of achievements as stats improve', async () => {
    const achievements = [
      makeThresholdAchievement(1, 'marathon', 'games_played', '>=', 20),
      makeThresholdAchievement(2, 'winner', 'games_won', '>=', 10),
      makeRatioAchievement(3, 'win_rate', 'games_won', 'games_played', 0.6, 10),
    ];

    const improvingStatsArb = fc
      .record({
        baseGames: fc.integer({ min: 10, max: 120 }),
        baseWins: fc.integer({ min: 0, max: 120 }),
        extraWins: fc.integer({ min: 0, max: 50 }),
      })
      .map(({ baseGames, baseWins, extraWins }) => {
        const games_won = Math.min(baseWins, baseGames);
        const games_played = Math.max(baseGames, 10);
        const improvedWins = games_won + extraWins;
        const improvedGames = Math.max(games_played, improvedWins);

        const baseStats = buildUserStats({
          user_id: userId,
          games_played,
          games_won,
          total_prestige_points: 0,
          total_cards_purchased: 0,
          total_nobles_acquired: 0,
          fastest_win_time: 1000,
          highest_prestige_score: 0,
        });

        const improvedStats = buildUserStats({
          user_id: userId,
          games_played: improvedGames,
          games_won: improvedWins,
          total_prestige_points: 0,
          total_cards_purchased: 0,
          total_nobles_acquired: 0,
          fastest_win_time: 900,
          highest_prestige_score: 0,
        });

        return { baseStats, improvedStats };
      });

    await fc.assert(
      fc.asyncProperty(improvingStatsArb, async ({ baseStats, improvedStats }) => {
        const repo = new FakeAchievementRepository();
        repo.achievements = achievements;
        const service = new AchievementService(repo);

        repo.setUserStats(userId, baseStats);
        const first = await service.evaluateUserAchievements(userId);

        repo.setUserStats(userId, improvedStats);
        const second = await service.evaluateUserAchievements(userId);

        const unlockedCodesAfter = new Set(repo.getUserAchievements(userId).map((ua) => {
          const match = achievements.find((a) => a.id === ua.achievement_id);
          return match?.code;
        }));

        first.newlyUnlocked.forEach((a) => expect(unlockedCodesAfter.has(a.code)).toBe(true));
        second.newlyUnlocked.forEach((a) => expect(unlockedCodesAfter.has(a.code)).toBe(true));
      }),
      { numRuns: 50 }
    );
  });

  it('keeps previously unlocked achievements even if later stats regress', async () => {
    const achievements = [
      makeThresholdAchievement(1, 'marathon', 'games_played', '>=', 10),
      makeRatioAchievement(2, 'win_rate', 'games_won', 'games_played', 0.5, 5),
    ];

    const regressStatsArb = fc
      .record({
        games_played: fc.integer({ min: 10, max: 200 }),
        games_won: fc.integer({ min: 5, max: 200 }),
        extraGamesNoWins: fc.integer({ min: 1, max: 50 }),
      })
      .map(({ games_played, games_won, extraGamesNoWins }) => {
        const baseGames = games_played;
        const baseWins = Math.min(games_won, games_played);
        const regressedGames = baseGames + extraGamesNoWins; // counts only increase
        const regressedWins = baseWins; // wins stay fixed so ratio can drop

        return {
          highStats: buildUserStats({
            user_id: userId,
            games_played: baseGames,
            games_won: baseWins,
            total_prestige_points: 0,
            total_cards_purchased: 0,
            total_nobles_acquired: 0,
            fastest_win_time: 1000,
            highest_prestige_score: 0,
          }),
          regressedStats: buildUserStats({
            user_id: userId,
            games_played: regressedGames,
            games_won: regressedWins,
            total_prestige_points: 0,
            total_cards_purchased: 0,
            total_nobles_acquired: 0,
            fastest_win_time: 1000,
            highest_prestige_score: 0,
          }),
        };
      });

    await fc.assert(
      fc.asyncProperty(regressStatsArb, async ({ highStats, regressedStats }) => {
        const repo = new FakeAchievementRepository();
        repo.achievements = achievements;
        const service = new AchievementService(repo);

        repo.setUserStats(userId, highStats);
        const first = await service.evaluateUserAchievements(userId);
        const initiallyUnlocked = new Set(first.newlyUnlocked.map((a) => a.code));

        repo.setUserStats(userId, regressedStats);
        const second = await service.evaluateUserAchievements(userId);

        expect(second.newlyUnlocked.length).toBe(0);
        expect(new Set(second.alreadyUnlocked)).toEqual(initiallyUnlocked);
        expect(repo.getUserAchievements(userId)).toHaveLength(initiallyUnlocked.size);
      }),
      { numRuns: 50 }
    );
  });

  it("keeps ratio unlock decision invariant when scaling numerator and denominator by the same factor", async () => {
    const ratioAchievement = makeRatioAchievement(10, 'win_rate_invariant', 'games_won', 'games_played', 0.6, 5);

    const ratioStatsArb = fc
      .record({
        games_played: fc.integer({ min: 5, max: 120 }),
        games_won: fc.integer({ min: 0, max: 120 }),
        scale: fc.integer({ min: 1, max: 10 }),
      })
      .filter(({ games_played, games_won }) => games_won <= games_played)
      .map(({ games_played, games_won, scale }) => ({
        base: buildUserStats({
          user_id: userId,
          games_played,
          games_won,
          total_prestige_points: 0,
          total_cards_purchased: 0,
          total_nobles_acquired: 0,
        }),
        scaled: buildUserStats({
          user_id: userId,
          games_played: games_played * scale,
          games_won: games_won * scale,
          total_prestige_points: 0,
          total_cards_purchased: 0,
          total_nobles_acquired: 0,
        }),
      }));

    const evalUnlock = async (stats: ReturnType<typeof buildUserStats>) => {
      const repo = new FakeAchievementRepository();
      repo.achievements = [ratioAchievement];
      repo.setUserStats(userId, stats);
      const service = new AchievementService(repo);
      const result = await service.evaluateUserAchievements(userId);
      return result.newlyUnlocked.some((a) => a.code === ratioAchievement.code);
    };

    await fc.assert(
      fc.asyncProperty(ratioStatsArb, async ({ base, scaled }) => {
        const baseUnlock = await evalUnlock(base);
        const scaledUnlock = await evalUnlock(scaled);

        expect(baseUnlock).toBe(scaledUnlock);
      }),
      { numRuns: 50 }
    );
  });

  it('does not depend on composite criteria order for unlock decisions', async () => {
    const thresholdTarget = 20;
    const ratioTarget = 0.5;
    const minSample = 10;

    const criteriaInOrder = [
      {
        achievement_id: 201,
        stat_key: 'games_played',
        comparator: '>=',
        target_value: thresholdTarget,
        denominator_stat_key: null,
        min_sample_size: null,
      },
      {
        achievement_id: 201,
        stat_key: 'games_won',
        comparator: '>=',
        target_value: ratioTarget,
        denominator_stat_key: 'games_played',
        min_sample_size: minSample,
      },
    ];

    const criteriaReversed = [...criteriaInOrder].reverse().map((crit) => ({ ...crit, achievement_id: 202 }));

    const statsArb = fc.record({
      games_played: fc.integer({ min: thresholdTarget, max: 200 }),
      winSurplus: fc.integer({ min: 0, max: 50 }),
    }).map(({ games_played, winSurplus }) => {
      const minimumWins = Math.ceil(games_played * ratioTarget);
      const games_won = Math.min(games_played, minimumWins + winSurplus);
      return buildUserStats({
        user_id: userId,
        games_played,
        games_won,
      });
    });

    const evalComposite = async (achievementId: number, criteria: typeof criteriaInOrder, stats: ReturnType<typeof buildUserStats>) => {
      const repo = new FakeAchievementRepository();
      repo.achievements = [
        {
          id: achievementId,
          code: `composite_${achievementId}`,
          name: `composite_${achievementId}`,
          description: 'composite test',
          category: 'composite',
          icon: null,
          unlock_type: 'composite',
          sort_order: achievementId,
          criteria,
        },
      ];
      repo.setUserStats(userId, stats);
      const service = new AchievementService(repo);
      const result = await service.evaluateUserAchievements(userId);
      return result.newlyUnlocked.some((a) => a.code === `composite_${achievementId}`);
    };

    await fc.assert(
      fc.asyncProperty(statsArb, async (stats) => {
        const orderedUnlock = await evalComposite(201, criteriaInOrder, stats);
        const reversedUnlock = await evalComposite(202, criteriaReversed, stats);

        expect(orderedUnlock).toBe(reversedUnlock);
      }),
      { numRuns: 50 }
    );
  });

  it('never unlocks composite achievements when only a subset of criteria are satisfied', async () => {
    const thresholdTarget = 25;
    const ratioTarget = 0.6;
    const minSample = 5;

    const compositeAchievement = {
      id: 300,
      code: 'subset_guard',
      name: 'subset_guard',
      description: 'composite subset guard',
      category: 'composite',
      icon: null,
      unlock_type: 'composite',
      sort_order: 300,
      criteria: [
        {
          achievement_id: 300,
          stat_key: 'games_played',
          comparator: '>=',
          target_value: thresholdTarget,
          denominator_stat_key: null,
          min_sample_size: null,
        },
        {
          achievement_id: 300,
          stat_key: 'games_won',
          comparator: '>=',
          target_value: ratioTarget,
          denominator_stat_key: 'games_played',
          min_sample_size: minSample,
        },
      ],
    };

    const partialStatsArb = fc.oneof(
      // Meets ratio but not threshold
      fc.integer({ min: minSample, max: thresholdTarget - 1 }).map((games_played) =>
        buildUserStats({
          user_id: userId,
          games_played,
          games_won: games_played, // ratio passes
        })
      ),
      // Meets threshold but not ratio
      fc.record({
        games_played: fc.integer({ min: thresholdTarget, max: 200 }),
        shortfall: fc.integer({ min: 1, max: 5 }),
      }).map(({ games_played, shortfall }) => {
        const winsBelowTarget = Math.max(0, Math.floor(games_played * ratioTarget) - shortfall);
        return buildUserStats({
          user_id: userId,
          games_played,
          games_won: winsBelowTarget,
        });
      })
    );

    await fc.assert(
      fc.asyncProperty(partialStatsArb, async (stats) => {
        const repo = new FakeAchievementRepository();
        repo.achievements = [compositeAchievement];
        repo.setUserStats(userId, stats);
        const service = new AchievementService(repo);

        const result = await service.evaluateUserAchievements(userId);
        expect(result.newlyUnlocked.length).toBe(0);
      }),
      { numRuns: 50 }
    );
  });
});
