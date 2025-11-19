import { GemType } from './types';
import { Card } from './Card';
import { Noble } from './Noble';
import { TokenBank } from './TokenBank';

/**
 * Represents a player in the game.
 * Encapsulates player state and behavior.
 */
export class Player {
  private tokens: TokenBank;
  private purchasedCards: Card[] = [];
  private reservedCards: Card[] = [];
  private nobles: Noble[] = [];
  private prestigePoints: number = 0;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly userId?: string
  ) {
    this.tokens = new TokenBank();
  }

  public getUserId(): string | undefined {
    return this.userId;
  }

  // Token management
  public getTokenBank(): TokenBank {
    return this.tokens;
  }

  public getTokenCount(gemType: GemType): number {
    return this.tokens.get(gemType);
  }

  public getTotalTokens(): number {
    return this.tokens.getTotalCount();
  }

  public addTokens(gemType: GemType, amount: number): void {
    this.tokens.add(gemType, amount);
  }

  public removeTokens(gemType: GemType, amount: number): void {
    this.tokens.remove(gemType, amount);
  }

  // Card management
  public getPurchasedCards(): readonly Card[] {
    return [...this.purchasedCards];
  }

  public addPurchasedCard(card: Card): void {
    this.purchasedCards.push(card);
    this.prestigePoints += card.prestigePoints;
  }

  public getReservedCards(): readonly Card[] {
    return [...this.reservedCards];
  }

  public addReservedCard(card: Card): void {
    if (this.reservedCards.length >= 3) {
      throw new Error('Cannot reserve more than 3 cards');
    }
    this.reservedCards.push(card);
  }

  public removeReservedCard(cardId: string): Card {
    const index = this.reservedCards.findIndex(c => c.id === cardId);
    if (index === -1) {
      throw new Error('Card not found in reserved cards');
    }
    return this.reservedCards.splice(index, 1)[0];
  }

  public hasReservedCard(cardId: string): boolean {
    return this.reservedCards.some(c => c.id === cardId);
  }

  // Noble management
  public getNobles(): readonly Noble[] {
    return [...this.nobles];
  }

  public addNoble(noble: Noble): void {
    this.nobles.push(noble);
    this.prestigePoints += noble.prestigePoints;
  }

  // Gem bonuses (from purchased cards)
  public getGemBonuses(): Map<GemType, number> {
    const bonuses = new Map<GemType, number>();
    
    for (const gemType of Object.values(GemType)) {
      bonuses.set(gemType, 0);
    }

    for (const card of this.purchasedCards) {
      const current = bonuses.get(card.gemBonus) || 0;
      bonuses.set(card.gemBonus, current + 1);
    }

    return bonuses;
  }

  // Prestige
  public getPrestige(): number {
    return this.prestigePoints;
  }

  public hasWinningPrestige(): boolean {
    return this.prestigePoints >= 15;
  }

  // Validation helpers
  public canAffordCard(card: Card): boolean {
    const bonuses = this.getGemBonuses();
    const effectiveCost = card.calculateEffectiveCost(bonuses);
    
    let goldNeeded = 0;
    for (const [gem, amount] of effectiveCost.entries()) {
      const available = this.tokens.get(gem);
      if (available < amount) {
        goldNeeded += amount - available;
      }
    }

    return this.tokens.get(GemType.GOLD) >= goldNeeded;
  }
}
