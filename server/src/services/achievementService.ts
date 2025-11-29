import { UserStats } from '../../../shared/types/user';
import { AchievementDto, AchievementRecord, AchievementsResponse, Comparator } from '../api/dtos';
import { DomainToDTOMapper } from '../api/mappers';
import { AchievementRepository, SqliteAchievementRepository } from '../repositories/achievementRepository';

interface AchievementCriteria {
  stat_key: string;
  comparator: Comparator;
  target_value: number;
  denominator_stat_key?: string | null;
  min_sample_size?: number | null;
}

type AchievementWithCriteria = AchievementRecord & { criteria: AchievementCriteria[] };

export class AchievementService {
  private repo: AchievementRepository;

  constructor(repo: AchievementRepository = new SqliteAchievementRepository()) {
    this.repo = repo;
  }

  async getUserAchievements(userId: string): Promise<AchievementsResponse> {
    const achievements = this.repo.getAchievementsWithCriteria();
    this.validateAchievements(achievements);
    const unlockedRows = this.repo.getUserAchievements(userId);
    const unlockedMap = new Map<number, { unlocked_at: number; progress_value?: number }>(
      unlockedRows.map(row => [row.achievement_id, { unlocked_at: row.unlocked_at, progress_value: row.progress_value }])
    );

    const unlocked: AchievementDto[] = [];
    const locked: AchievementDto[] = [];

    achievements.forEach((ach) => {
      const unlockedInfo = unlockedMap.get(ach.id);
      const base = DomainToDTOMapper.mapAchievement(ach);
      if (unlockedInfo) {
        unlocked.push({
          ...base,
          unlockedAt: unlockedInfo.unlocked_at,
          progressValue: unlockedInfo.progress_value,
        });
      } else {
        locked.push(base);
      }
    });

    return { unlocked, locked };
  }

  async evaluateUserAchievements(userId: string): Promise<{ newlyUnlocked: AchievementDto[]; alreadyUnlocked: string[] }> {
    const stats = this.getUserStats(userId);
    this.validateUserStats(stats);
    const achievements = this.repo.getAchievementsWithCriteria();
    this.validateAchievements(achievements);
    const unlockedIds = new Set(this.repo.getUserAchievements(userId).map((ua) => ua.achievement_id));

    const newlyUnlocked: AchievementDto[] = [];
    const alreadyUnlocked: string[] = [];
    const now = Date.now();

    achievements.forEach((ach) => {
      const already = unlockedIds.has(ach.id);
      if (already) {
        // Once unlocked, we never revoke achievements even if stats regress (e.g., data corrections).
        alreadyUnlocked.push(ach.code);
        return;
      }

      const passed = this.meetsCriteria(ach, stats);
      if (passed) {
        const progressValue = this.deriveProgressValue(ach, stats);
        this.repo.insertUserAchievement({
          userId,
          achievementId: ach.id,
          unlockedAt: now,
          progressValue,
          progressDetail: JSON.stringify({ statsSnapshot: stats }),
        });
        newlyUnlocked.push({
          ...DomainToDTOMapper.mapAchievement(ach),
          unlockedAt: now,
          progressValue,
        });
      }
    });

    return { newlyUnlocked, alreadyUnlocked };
  }

  private getUserStats(userId: string): UserStats {
    const statsRow = this.repo.getUserStats(userId);
    if (!statsRow) {
      throw new Error('User stats not found');
    }
    return statsRow;
  }

  private meetsCriteria(achievement: AchievementWithCriteria, stats: UserStats): boolean {
    const criteria = achievement.criteria || [];
    if (criteria.length === 0) {
      return true;
    }

    return criteria.every((crit: AchievementCriteria) => {
      if (!crit.comparator || crit.target_value === undefined || crit.target_value === null) {
        throw new Error(`Invalid criterion for achievement ${achievement.code}`);
      }
      if (crit.stat_key === 'favorite_gem_type') {
        return Boolean((stats as any).favorite_gem_type);
      }

      const numerator = (stats as any)[crit.stat_key];
      if (numerator === undefined || numerator === null) {
        return false;
      }

      let value = numerator;
      if (crit.denominator_stat_key) {
        const denom = (stats as any)[crit.denominator_stat_key];
        if (!denom || denom <= 0) {
          return false;
        }
        if (crit.min_sample_size && denom < crit.min_sample_size) {
          return false;
        }
        value = numerator / denom;
      }

      return this.compare(value, crit.comparator, crit.target_value);
    });
  }

  private compare(value: number, comparator: Comparator, target: number): boolean {
    switch (comparator) {
      case '>=': return value >= target;
      case '<=': return value <= target;
      case '>': return value > target;
      case '<': return value < target;
      case '=': return value === target;
      default: return false;
    }
  }

  private deriveProgressValue(achievement: AchievementWithCriteria, stats: UserStats): number | undefined {
    const crit = (achievement.criteria || [])[0];
    if (!crit) return undefined;
    if (crit.denominator_stat_key) {
      const denom = (stats as any)[crit.denominator_stat_key];
      const numer = (stats as any)[crit.stat_key];
      if (!denom || denom <= 0) return undefined;
      return numer / denom;
    }
    const numer = (stats as any)[crit.stat_key];
    return typeof numer === 'number' ? numer : undefined;
  }

  private validateUserStats(stats: UserStats): void {
    const numericFields: Array<keyof UserStats> = [
      'games_played',
      'games_won',
      'total_prestige_points',
      'total_cards_purchased',
      'total_nobles_acquired',
      'fastest_win_time',
      'highest_prestige_score',
    ];
    numericFields.forEach((field) => {
      const value = stats[field];
      if (value !== undefined && value !== null && typeof value !== 'number') {
        throw new Error(`Invalid user_stats value for ${String(field)}`);
      }
    });
  }

  private validateAchievements(achievements: AchievementWithCriteria[]): void {
    achievements.forEach((ach) => {
      if (!ach.code || !ach.name || !ach.unlock_type) {
        throw new Error(`Invalid achievement configuration: ${ach.code || '(missing code)'}`);
      }
      const criteria = ach.criteria || [];
      if (criteria.length === 0) {
        return;
      }
      criteria.forEach((crit) => {
        if (!crit.stat_key || crit.target_value === undefined || crit.target_value === null || !crit.comparator) {
          throw new Error(`Invalid criterion for achievement ${ach.code}`);
        }
        if (crit.denominator_stat_key && crit.min_sample_size !== undefined && crit.min_sample_size !== null && crit.min_sample_size < 0) {
          throw new Error(`Invalid min_sample_size for achievement ${ach.code}`);
        }
      });
    });
  }
}
