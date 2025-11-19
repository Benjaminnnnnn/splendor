import { GemType, GemCost } from './types';

/**
 * Represents a development card in the game.
 */
export class Card {
  constructor(
    public readonly id: string,
    public readonly tier: 1 | 2 | 3,
    public readonly prestigePoints: number,
    public readonly gemBonus: GemType,
    public readonly cost: GemCost
  ) {}

  /**
   * Calculate the effective cost after applying player's bonuses
   */
  public calculateEffectiveCost(bonuses: Map<GemType, number>): Map<GemType, number> {
    const effectiveCost = new Map<GemType, number>();
    
    for (const [gem, amount] of Object.entries(this.cost)) {
      const gemType = gem as GemType;
      const bonus = bonuses.get(gemType) || 0;
      const needed = Math.max(0, (amount || 0) - bonus);
      if (needed > 0) {
        effectiveCost.set(gemType, needed);
      }
    }
    
    return effectiveCost;
  }
}
