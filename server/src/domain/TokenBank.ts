import { GemType, TokenCount } from './types';

/**
 * Represents a player's token bank.
 * Encapsulates token management logic.
 */
export class TokenBank {
  private tokens: TokenCount;

  constructor(initialTokens?: Partial<TokenCount>) {
    this.tokens = {
      [GemType.DIAMOND]: initialTokens?.diamond || 0,
      [GemType.SAPPHIRE]: initialTokens?.sapphire || 0,
      [GemType.EMERALD]: initialTokens?.emerald || 0,
      [GemType.RUBY]: initialTokens?.ruby || 0,
      [GemType.ONYX]: initialTokens?.onyx || 0,
      [GemType.GOLD]: initialTokens?.gold || 0,
    };
  }

  public get(gemType: GemType): number {
    return this.tokens[gemType];
  }

  public set(gemType: GemType, amount: number): void {
    if (amount < 0) {
      throw new Error('Token amount cannot be negative');
    }
    this.tokens[gemType] = amount;
  }

  public add(gemType: GemType, amount: number): void {
    if (amount < 0) {
      throw new Error('Cannot add negative tokens');
    }
    this.tokens[gemType] += amount;
  }

  public remove(gemType: GemType, amount: number): void {
    if (amount < 0) {
      throw new Error('Cannot remove negative tokens');
    }
    if (this.tokens[gemType] < amount) {
      throw new Error(`Insufficient ${gemType} tokens`);
    }
    this.tokens[gemType] -= amount;
  }

  public getTotalCount(): number {
    return Object.values(this.tokens).reduce((sum, count) => sum + count, 0);
  }

  public getColoredTokenCount(): number {
    const { gold, ...colored } = this.tokens;
    return Object.values(colored).reduce((sum, count) => sum + count, 0);
  }

  public hasTokens(required: Map<GemType, number>): boolean {
    for (const [gem, amount] of required.entries()) {
      if (this.tokens[gem] < amount) {
        return false;
      }
    }
    return true;
  }

  public toObject(): TokenCount {
    return { ...this.tokens };
  }

  public clone(): TokenBank {
    return new TokenBank(this.tokens);
  }
}
