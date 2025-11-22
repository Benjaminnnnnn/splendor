import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';

export type TokenSelection = {
  [key in GemType]?: number;
};

/**
 * Command for taking tokens from the bank.
 * Implements game rules for token selection.
 */
export class TakeTokensCommand extends GameCommand {
  constructor(
    private readonly playerId: string,
    private readonly tokens: TokenSelection
  ) {
    super();
  }

  run(game: Game): void {
    this.validateGameInProgress(game);
    this.validatePlayerTurn(game, this.playerId);

    const player = game.getPlayer(this.playerId);
    const bank = game.getBank();

    // Calculate token counts
    const gemTypes: GemType[] = [
      GemType.DIAMOND,
      GemType.SAPPHIRE,
      GemType.EMERALD,
      GemType.RUBY,
      GemType.ONYX
    ];

    const selectedTokens = new Map<GemType, number>();
    let totalSelected = 0;
    let nonZeroCount = 0;

    for (const gem of gemTypes) {
      const count = this.tokens[gem] || 0;
      if (count > 0) {
        selectedTokens.set(gem, count);
        totalSelected += count;
        nonZeroCount++;
      }
      if (count < 0) {
        throw new Error('Cannot select negative tokens');
      }
    }

    // Rule: Cannot take gold tokens directly
    if (this.tokens[GemType.GOLD] && this.tokens[GemType.GOLD] > 0) {
      throw new Error('Cannot take gold tokens directly');
    }

    // Rule: Must take at least one token
    if (totalSelected === 0) {
      throw new Error('Must select at least one token');
    }

    // Rule: Can only take 3 different gems OR 2 of the same gem
    const isTakingThreeDifferent = nonZeroCount === 3 && totalSelected === 3;
    const isTakingTwoSame = nonZeroCount === 1 && totalSelected === 2;

    if (!isTakingThreeDifferent && !isTakingTwoSame) {
      throw new Error('Invalid token selection: must take 3 different or 2 of the same');
    }

    // Rule: When taking 2 of same color, must have 4+ available in bank
    if (isTakingTwoSame) {
      const selectedGem = Array.from(selectedTokens.keys())[0];
      if (bank.get(selectedGem) < 4) {
        throw new Error('Cannot take 2 tokens of the same color unless 4+ are available');
      }
    }

    // Rule: Check if tokens are available in bank
    for (const [gem, count] of selectedTokens) {
      if (bank.get(gem) < count) {
        throw new Error(`Insufficient ${gem} tokens in bank`);
      }
    }

    // Rule: Player cannot exceed 10 tokens
    const playerTotal = player.getTotalTokens();
    if (playerTotal + totalSelected > 10) {
      throw new Error('Cannot exceed 10 tokens. Must return tokens first.');
    }

    // Transfer tokens from bank to player
    for (const [gem, count] of selectedTokens) {
      bank.remove(gem, count);
      player.addTokens(gem, count);
    }

    game.advanceTurn();
    game.updateTimestamp();
  }
}
