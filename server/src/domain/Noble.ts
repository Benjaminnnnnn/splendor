import { GemType, GemCost } from './types';

/**
 * Represents a noble tile in the game.
 * Immutable value object.
 */
export class Noble {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly prestigePoints: number,
    public readonly requirements: GemCost
  ) {}

  /**
   * Check if a player meets the requirements for this noble
   */
  public meetsRequirements(bonuses: Map<GemType, number>): boolean {
    for (const [gem, required] of Object.entries(this.requirements)) {
      const gemType = gem as GemType;
      const playerBonus = bonuses.get(gemType) || 0;
      if (playerBonus < (required || 0)) {
        return false;
      }
    }
    return true;
  }
}
