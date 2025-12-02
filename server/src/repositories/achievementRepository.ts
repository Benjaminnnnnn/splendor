import { UserStats } from '../../../shared/types/user';
import { AchievementRecord, Comparator } from '../api/dtos';
import { DatabaseConnection } from '../infrastructure/database';

export interface AchievementCriteriaRow {
  achievement_id: number;
  stat_key: string;
  comparator: Comparator;
  target_value: number;
  denominator_stat_key?: string | null;
  min_sample_size?: number | null;
}

export interface UserAchievementRow {
  achievement_id: number;
  unlocked_at: number;
  progress_value?: number;
}

export interface AchievementRepository {
  getAchievementsWithCriteria(): Array<AchievementRecord & { criteria: AchievementCriteriaRow[] }>;
  getUserAchievements(userId: string): UserAchievementRow[];
  getUserStats(userId: string): UserStats | null;
  insertUserAchievement(entry: {
    userId: string;
    achievementId: number;
    unlockedAt: number;
    progressValue?: number;
    progressDetail?: string;
  }): void;
}

export class SqliteAchievementRepository implements AchievementRepository {
  constructor(private readonly db: DatabaseConnection = DatabaseConnection.getInstance()) {}

  getAchievementsWithCriteria(): Array<AchievementRecord & { criteria: AchievementCriteriaRow[] }> {
    const rows = this.db.query(
      `SELECT a.*, ac.id as crit_id, ac.stat_key, ac.comparator, ac.target_value, ac.denominator_stat_key, ac.min_sample_size
       FROM achievements a
       LEFT JOIN achievement_criteria ac ON ac.achievement_id = a.id
       ORDER BY a.sort_order, a.id, ac.id`
    );

    return rows.reduce((acc: Array<AchievementRecord & { criteria: AchievementCriteriaRow[] }>, row: any) => {
      let record = acc.find((a) => a.id === row.id);
      if (!record) {
        record = {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          category: row.category,
          icon: row.icon,
          unlock_type: row.unlock_type,
          sort_order: row.sort_order,
          criteria: [],
        };
        acc.push(record);
      }
      if (row.crit_id) {
        record.criteria.push({
          achievement_id: row.id,
          stat_key: row.stat_key,
          comparator: row.comparator,
          target_value: row.target_value,
          denominator_stat_key: row.denominator_stat_key,
          min_sample_size: row.min_sample_size,
        });
      }
      return acc;
    }, []);
  }

  getUserAchievements(userId: string): UserAchievementRow[] {
    return this.db.query(
      `SELECT ua.achievement_id, ua.unlocked_at, ua.progress_value
       FROM user_achievements ua
       WHERE ua.user_id = ?`,
      [userId]
    ) as UserAchievementRow[];
  }

  getUserStats(userId: string): UserStats | null {
    const statsRow = this.db.get('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
    if (!statsRow) {
      return null;
    }
    return {
      id: statsRow.id,
      user_id: statsRow.user_id,
      games_played: statsRow.games_played,
      games_won: statsRow.games_won,
      total_prestige_points: statsRow.total_prestige_points,
      total_cards_purchased: statsRow.total_cards_purchased,
      total_nobles_acquired: statsRow.total_nobles_acquired,
      fastest_win_time: statsRow.fastest_win_time,
      highest_prestige_score: statsRow.highest_prestige_score,
      favorite_gem_type: statsRow.favorite_gem_type,
      virtual_currency: statsRow.virtual_currency || 1000,
      created_at: new Date(statsRow.created_at),
      updated_at: new Date(statsRow.updated_at),
    };
  }

  insertUserAchievement(entry: {
    userId: string;
    achievementId: number;
    unlockedAt: number;
    progressValue?: number;
    progressDetail?: string;
  }): void {
    this.db.run(
      `INSERT OR IGNORE INTO user_achievements
        (user_id, achievement_id, unlocked_at, progress_value, progress_detail)
        VALUES (?, ?, ?, ?, ?)`,
      [
        entry.userId,
        entry.achievementId,
        entry.unlockedAt,
        entry.progressValue,
        entry.progressDetail || null,
      ]
    );
  }
}
