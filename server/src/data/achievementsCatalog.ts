import { AchievementCatalogEntryWithCode, AchievementCode, achievementsCatalog } from '../../../shared/data/achievement';
import { AchievementCriterion } from '../../../shared/types/user';
import { DatabaseConnection } from '../infrastructure/database';

export { AchievementCatalogEntryWithCode, AchievementCode, AchievementCriterion, achievementsCatalog };

/**
 * Idempotently seeds the achievements catalog into the database.
 * Safe to run on every startup; relies on UNIQUE(code) in achievements.
 */
export function syncAchievementCatalog(db: DatabaseConnection = DatabaseConnection.getInstance()): void {
  db.transaction(() => {
    achievementsCatalog.forEach((ach) => {
      db.run(
        `INSERT INTO achievements (code, name, description, category, icon, unlock_type, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))
         ON CONFLICT(code) DO UPDATE SET
           name=excluded.name,
           description=excluded.description,
           category=excluded.category,
           icon=excluded.icon,
           unlock_type=excluded.unlock_type,
           sort_order=excluded.sort_order,
           updated_at=strftime('%s','now')`,
        [
          ach.code,
          ach.name,
          ach.description,
          ach.category,
          ach.icon ?? null,
          ach.unlockType,
          ach.sortOrder ?? 0,
        ]
      );

      const row = db.get(`SELECT id FROM achievements WHERE code = ?`, [ach.code]);
      if (!row) {
        throw new Error(`Failed to retrieve achievement id for code ${ach.code} after upsert`);
      }

      db.run(`DELETE FROM achievement_criteria WHERE achievement_id = ?`, [row.id]);
      ach.criteria.forEach((crit) => {
        db.run(
          `INSERT INTO achievement_criteria
            (achievement_id, stat_key, comparator, target_value, denominator_stat_key, min_sample_size)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            crit.statKey,
            crit.comparator,
            crit.targetValue,
            crit.denominatorStatKey ?? null,
            crit.minSampleSize ?? null,
          ]
        );
      });
    });
  });
}
