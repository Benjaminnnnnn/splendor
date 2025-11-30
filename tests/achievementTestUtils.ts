import { AchievementRecord } from '../server/src/api/dtos';
import {
  AchievementCriteriaRow,
  AchievementRepository,
  UserAchievementRow,
} from '../server/src/repositories/achievementRepository';
import { UserStats } from '../shared/types/user';

type AchievementWithCriteria = AchievementRecord & { criteria: AchievementCriteriaRow[] };

export class FakeAchievementRepository implements AchievementRepository {
  achievements: AchievementWithCriteria[] = [];
  private userAchievements = new Map<string, UserAchievementRow[]>();
  private stats = new Map<string, UserStats>();

  getAchievementsWithCriteria(): AchievementWithCriteria[] {
    return this.achievements.map((a) => ({
      ...a,
      criteria: a.criteria.map((c) => ({ ...c })),
    }));
  }

  getUserAchievements(userId: string): UserAchievementRow[] {
    return [...(this.userAchievements.get(userId) || [])];
  }

  getUserStats(userId: string): UserStats | null {
    return this.stats.get(userId) || null;
  }

  insertUserAchievement(entry: {
    userId: string;
    achievementId: number;
    unlockedAt: number;
    progressValue?: number;
    progressDetail?: string;
  }): void {
    const current = this.userAchievements.get(entry.userId) || [];
    if (!current.some((ua) => ua.achievement_id === entry.achievementId)) {
      current.push({
        achievement_id: entry.achievementId,
        unlocked_at: entry.unlockedAt,
        progress_value: entry.progressValue,
      });
      this.userAchievements.set(entry.userId, current);
    }
  }

  setUserStats(userId: string, stats: UserStats): void {
    this.stats.set(userId, stats);
  }
}

export const buildUserStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  id: overrides.id ?? 1,
  user_id: overrides.user_id ?? 'user-1',
  games_played: overrides.games_played ?? 0,
  games_won: overrides.games_won ?? 0,
  total_prestige_points: overrides.total_prestige_points ?? 0,
  total_cards_purchased: overrides.total_cards_purchased ?? 0,
  total_nobles_acquired: overrides.total_nobles_acquired ?? 0,
  fastest_win_time: overrides.fastest_win_time,
  highest_prestige_score: overrides.highest_prestige_score ?? 0,
  favorite_gem_type: overrides.favorite_gem_type,
  created_at: overrides.created_at ?? new Date(),
  updated_at: overrides.updated_at ?? new Date(),
});

export const makeThresholdAchievement = (
  id: number,
  code: string,
  statKey: string,
  comparator: AchievementCriteriaRow['comparator'],
  target: number,
  category = 'milestone'
): AchievementWithCriteria => ({
  id,
  code,
  name: code,
  description: `${code} description`,
  category,
  icon: null,
  unlock_type: 'threshold',
  sort_order: id,
  criteria: [
    {
      achievement_id: id,
      stat_key: statKey,
      comparator,
      target_value: target,
      denominator_stat_key: null,
      min_sample_size: null,
    },
  ],
});

export const makeRatioAchievement = (
  id: number,
  code: string,
  numerator: string,
  denominator: string,
  target: number,
  minSampleSize: number
): AchievementWithCriteria => ({
  id,
  code,
  name: code,
  description: `${code} ratio`,
  category: 'ratio',
  icon: null,
  unlock_type: 'ratio',
  sort_order: id,
  criteria: [
    {
      achievement_id: id,
      stat_key: numerator,
      comparator: '>=',
      target_value: target,
      denominator_stat_key: denominator,
      min_sample_size: minSampleSize,
    },
  ],
});

export const makeFavoriteGemAchievement = (id: number, code: string): AchievementWithCriteria => ({
  id,
  code,
  name: code,
  description: `${code} favorite gem`,
  category: 'meta',
  icon: null,
  unlock_type: 'threshold',
  sort_order: id,
  criteria: [
    {
      achievement_id: id,
      stat_key: 'favorite_gem_type',
      comparator: '>=',
      target_value: 1,
      denominator_stat_key: null,
      min_sample_size: null,
    },
  ],
});
