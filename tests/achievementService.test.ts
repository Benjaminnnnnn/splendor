import { beforeEach, describe, expect, it } from 'vitest';
import { AchievementService } from '../server/src/services/achievementService';
import {
  FakeAchievementRepository,
  buildUserStats,
  makeFavoriteGemAchievement,
  makeRatioAchievement,
  makeThresholdAchievement,
} from './achievementTestUtils';


describe('Achievement Service', () => {
  let repo: FakeAchievementRepository;
  let service: AchievementService;
  const userId = 'user-123';

  beforeEach(() => {
    repo = new FakeAchievementRepository();
    service = new AchievementService(repo);
  });

  describe('getUserAchievements', () => {
    it('returns unlocked with timestamps and progress along with locked catalog items', async () => {
      repo.achievements = [
        makeThresholdAchievement(1, 'first_win', 'games_won', '>=', 1),
        makeThresholdAchievement(2, 'marathon', 'games_played', '>=', 50),
      ];
      repo.setUserStats(userId, buildUserStats());
      repo.insertUserAchievement({ userId, achievementId: 1, unlockedAt: 1111, progressValue: 2 });

      const result = await service.getUserAchievements(userId);

      expect(result.unlocked).toEqual([
        expect.objectContaining({ code: 'first_win', unlockedAt: 1111, progressValue: 2 }),
      ]);
      expect(result.locked).toEqual([expect.objectContaining({ code: 'marathon' })]);
    });
  });

  describe('evaluateUserAchievements', () => {
    beforeEach(() => {
      repo.achievements = [
        makeThresholdAchievement(1, 'marathon_20', 'games_played', '>=', 20),
        makeRatioAchievement(2, 'win_rate_60', 'games_won', 'games_played', 0.6, 10),
        makeFavoriteGemAchievement(3, 'gem_specialist'),
      ];
    });

    it('evaluates threshold achievements at boundary values', async () => {
      const scenarios = [
        { games_played: 19, expectedUnlocked: [] },
        { games_played: 20, expectedUnlocked: ['marathon_20'] },
        { games_played: 25, expectedUnlocked: ['marathon_20'] },
      ];

      for (const { games_played, expectedUnlocked } of scenarios) {
        const localRepo = new FakeAchievementRepository();
        localRepo.achievements = [
          makeThresholdAchievement(1, 'marathon_20', 'games_played', '>=', 20),
          makeRatioAchievement(2, 'win_rate_60', 'games_won', 'games_played', 0.6, 10),
          makeFavoriteGemAchievement(3, 'gem_specialist'),
        ];
        localRepo.setUserStats(userId, buildUserStats({ games_played }));
        const localService = new AchievementService(localRepo);
        const result = await localService.evaluateUserAchievements(userId);
        expect(result.newlyUnlocked.map((a) => a.code)).toEqual(expectedUnlocked);
      }
    });

    it('unlocks newly passed achievements and reports already unlocked ones', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 25,
          games_won: 18,
          favorite_gem_type: 'diamond',
        })
      );
      repo.insertUserAchievement({ userId, achievementId: 1, unlockedAt: 1 }); // pre-unlocked

      const result = await service.evaluateUserAchievements(userId);

      const codes = result.newlyUnlocked.map((a) => a.code);
      expect(codes).toContain('win_rate_60');
      expect(codes).toContain('gem_specialist');
      expect(result.alreadyUnlocked).toContain('marathon_20');
      expect(repo.getUserAchievements(userId).length).toBe(3);
    });

    it('skips ratio achievements until min sample size is met', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 4,
          games_won: 4,
          favorite_gem_type: 'diamond',
        })
      );

      const result = await service.evaluateUserAchievements(userId);

      expect(result.newlyUnlocked.map((a) => a.code)).toEqual(['gem_specialist']);
      expect(repo.getUserAchievements(userId).map((ua) => ua.achievement_id)).toEqual([3]);
    });

    it('unlocks only achievements whose specific criteria are satisfied', async () => {
      repo.achievements = [
        makeThresholdAchievement(10, 'cards_master', 'total_cards_purchased', '>=', 50),
        makeThresholdAchievement(11, 'noble_collector', 'total_nobles_acquired', '>=', 10),
      ];
      repo.setUserStats(
        userId,
        buildUserStats({
          total_cards_purchased: 60,
          total_nobles_acquired: 5,
        })
      );

      const result = await service.evaluateUserAchievements(userId);

      expect(result.newlyUnlocked.map((a) => a.code)).toEqual(['cards_master']);
    });

    it('covers all catalog criteria and unlocks the correct set for given stats', async () => {
      repo.achievements = [
        makeThresholdAchievement(1, 'first_game', 'games_played', '>=', 1),
        makeThresholdAchievement(2, 'first_win', 'games_won', '>=', 1),
        makeThresholdAchievement(3, 'marathon_20', 'games_played', '>=', 20),
        makeThresholdAchievement(4, 'marathon_50', 'games_played', '>=', 50),
        makeThresholdAchievement(5, 'card_collector', 'total_cards_purchased', '>=', 50),
        makeThresholdAchievement(6, 'card_mogul', 'total_cards_purchased', '>=', 100),
        makeThresholdAchievement(7, 'winner_10', 'games_won', '>=', 10),
        makeThresholdAchievement(8, 'prestige_hunter', 'highest_prestige_score', '>=', 18),
        makeThresholdAchievement(9, 'prestige_hoarder', 'total_prestige_points', '>=', 200),
        makeThresholdAchievement(10, 'speedrunner', 'fastest_win_time', '<=', 900),
        makeThresholdAchievement(11, 'swift_victory', 'fastest_win_time', '<=', 600),
        makeThresholdAchievement(12, 'noble_courtier', 'total_nobles_acquired', '>=', 10),
        makeThresholdAchievement(13, 'noble_diplomat', 'total_nobles_acquired', '>=', 25),
        makeFavoriteGemAchievement(14, 'gem_specialist'),
        makeRatioAchievement(15, 'consistent_winner', 'games_won', 'games_played', 0.6, 10),
      ];

      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 55,
          games_won: 33,
          total_cards_purchased: 120,
          total_nobles_acquired: 26,
          fastest_win_time: 580,
          highest_prestige_score: 19,
          total_prestige_points: 240,
          favorite_gem_type: 'ruby',
        })
      );

      const result = await service.evaluateUserAchievements(userId);
      const unlockedCodes = new Set(result.newlyUnlocked.map((a) => a.code));

      expect(unlockedCodes).toEqual(
        new Set([
          'first_game',
          'first_win',
          'marathon_20',
          'marathon_50',
          'card_collector',
          'card_mogul',
          'winner_10',
          'prestige_hunter',
          'prestige_hoarder',
          'speedrunner',
          'swift_victory',
          'noble_courtier',
          'noble_diplomat',
          'gem_specialist',
          'consistent_winner',
        ])
      );
    });

    it('does not unlock ratio achievements when denominator is zero or missing', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 0,
          games_won: 10,
        })
      );
      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).not.toContain('win_rate_60');
    });

    it('does not unlock ratio achievements when ratio is below target even with sample size met', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 15,
          games_won: 8, // 0.533 < 0.6
        })
      );
      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).not.toContain('win_rate_60');
      expect(repo.getUserAchievements(userId)).toHaveLength(0);
    });

    it('does not unlock composite favorite-gem achievement when favorite_gem_type is missing', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_won: 10,
          games_played: 12,
          favorite_gem_type: undefined,
        })
      );
      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).not.toContain('gem_specialist');
    });

    it('does not unlock composite favorite-gem achievement when favorite_gem_type is empty string', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_won: 10,
          games_played: 12,
          favorite_gem_type: '',
        })
      );
      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).not.toContain('gem_specialist');
    });

    it('requires all criteria for composite achievements', async () => {
      repo.achievements.push({
        id: 4,
        code: 'prestige_combo',
        name: 'prestige_combo',
        description: 'combo',
        category: 'composite',
        icon: null,
        unlock_type: 'composite',
        sort_order: 4,
        criteria: [
          {
            achievement_id: 4,
            stat_key: 'games_played',
            comparator: '>=',
            target_value: 20,
            denominator_stat_key: null,
            min_sample_size: null,
          },
          {
            achievement_id: 4,
            stat_key: 'total_prestige_points',
            comparator: '>=',
            target_value: 200,
            denominator_stat_key: null,
            min_sample_size: null,
          },
        ],
      });
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 25,
          games_won: 18,
          total_prestige_points: 150,
          favorite_gem_type: 'diamond',
        })
      );
      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).not.toContain('prestige_combo');
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 30,
          games_won: 20,
          total_prestige_points: 220,
          favorite_gem_type: 'emerald',
        })
      );
      const resultAfter = await service.evaluateUserAchievements(userId);
      expect(resultAfter.newlyUnlocked.map((a) => a.code)).toContain('prestige_combo');
    });

    it('records progress value for ratio and threshold achievements', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 20,
          games_won: 12,
          total_prestige_points: 210,
          favorite_gem_type: 'diamond',
        })
      );

      const result = await service.evaluateUserAchievements(userId);

      const winRate = result.newlyUnlocked.find((a) => a.code === 'win_rate_60');
      expect(winRate?.progressValue).toBeCloseTo(0.6, 5);
      const marathon = result.newlyUnlocked.find((a) => a.code === 'marathon_20');
      expect(marathon?.progressValue).toBe(20);
    });

    it('throws when user stats are missing for the given user', async () => {
      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/User stats not found/);
    });

    it("does not unlock achievements for other users' stats", async () => {
      const otherUser = 'user-999';
      repo.setUserStats(
        userId,
        buildUserStats({ games_played: 25, games_won: 18, favorite_gem_type: 'diamond' })
      );
      repo.setUserStats(
        otherUser,
        buildUserStats({ user_id: otherUser, games_played: 30, games_won: 25, favorite_gem_type: 'emerald' })
      );
      await service.evaluateUserAchievements(userId);
      expect(repo.getUserAchievements(userId).length).toBeGreaterThan(0);
      expect(repo.getUserAchievements(otherUser)).toHaveLength(0);
    });

    it('fails fast on invalid achievement configuration', async () => {
      repo.achievements = [
        {
          // missing name triggers validation
          id: 99,
          code: 'bad',
          name: '',
          description: 'broken',
          category: 'meta',
          icon: null,
          unlock_type: 'threshold',
          sort_order: 1,
          criteria: [],
        },
      ];
      repo.setUserStats(userId, buildUserStats());

      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid achievement configuration/);
    });

    it('fails when criterion has invalid min_sample_size', async () => {
      repo.achievements = [
        {
          id: 101,
          code: 'bad_min',
          name: 'bad_min',
          description: 'bad',
          category: 'ratio',
          icon: null,
          unlock_type: 'ratio',
          sort_order: 1,
          criteria: [
            {
              achievement_id: 101,
              stat_key: 'games_won',
              comparator: '>=',
              target_value: 0.5,
              denominator_stat_key: 'games_played',
              min_sample_size: -1,
            },
          ],
        },
      ];
      repo.setUserStats(userId, buildUserStats());

      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid min_sample_size/);
    });

    it('fails when criterion is missing required fields', async () => {
      repo.achievements = [
        {
          id: 102,
          code: 'bad_criterion',
          name: 'bad',
          description: 'bad',
          category: 'milestone',
          icon: null,
          unlock_type: 'threshold',
          sort_order: 1,
          // missing comparator and target_value
          criteria: [
            {
              achievement_id: 102,
              stat_key: 'games_played',
              comparator: undefined as unknown as any,
              target_value: undefined as unknown as any,
            },
          ],
        },
      ];
      repo.setUserStats(userId, buildUserStats());

      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid criterion/);
    });

    it('fails when criterion has missing comparator', async () => {
      repo.achievements = [
        {
          id: 103,
          code: 'missing_comparator',
          name: 'missing comparator',
          description: 'bad',
          category: 'milestone',
          icon: null,
          unlock_type: 'threshold',
          sort_order: 1,
          criteria: [
            {
              achievement_id: 103,
              stat_key: 'games_played',
              comparator: undefined as unknown as any, // trigger branch
              target_value: 5,
            },
          ],
        },
      ];
      repo.setUserStats(userId, buildUserStats({ games_played: 10 }));

      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid criterion/);
    });

    it('fails when comparator is missing even with a target_value', async () => {
      const localRepo = new FakeAchievementRepository();
      const localService = new AchievementService(localRepo);
      (localService as any).validateAchievements = () => { }; // bypass validation to reach meetsCriteria guard
      localRepo.achievements = [
        {
          id: 104,
          code: 'bad_comparator',
          name: 'bad_comparator',
          description: 'bad',
          category: 'milestone',
          icon: null,
          unlock_type: 'threshold',
          sort_order: 1,
          criteria: [
            {
              achievement_id: 104,
              stat_key: 'games_played',
              comparator: undefined as unknown as any, // hits meetsCriteria guard
              target_value: 5,
            },
          ],
        },
      ];
      localRepo.setUserStats(userId, buildUserStats({ games_played: 10 }));

      await expect(localService.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid criterion/);
    });

    it('supports equality comparator branch', async () => {
      repo.achievements = [makeThresholdAchievement(200, 'exact_20', 'games_played', '=', 20)];
      repo.setUserStats(userId, buildUserStats({ games_played: 20 }));

      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).toEqual(['exact_20']);
    });

    it('returns false when stats are missing the numerator field', async () => {
      repo.achievements = [makeThresholdAchievement(201, 'needs_tokens', 'missing_stat', '>=', 1)];
      repo.setUserStats(userId, buildUserStats());

      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked).toHaveLength(0);
    });

    it('auto-unlocks achievements with empty criteria', async () => {
      repo.achievements = [
        {
          id: 300,
          code: 'empty',
          name: 'empty',
          description: 'no criteria',
          category: 'meta',
          icon: null,
          unlock_type: 'threshold',
          sort_order: 1,
          criteria: [],
        },
      ];
      repo.setUserStats(userId, buildUserStats());

      const result = await service.evaluateUserAchievements(userId);
      expect(result.newlyUnlocked.map((a) => a.code)).toEqual(['empty']);
    });

    it('throws when user stats contain non-numeric data for numeric fields', async () => {
      repo.setUserStats(
        userId,
        buildUserStats({
          games_played: 'a lot' as unknown as number,
        })
      );

      await expect(service.evaluateUserAchievements(userId)).rejects.toThrow(/Invalid user_stats value/);
    });
  });
});
