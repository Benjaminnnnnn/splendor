import { GameCommand } from './GameCommand';
import { Game } from '../Game';
import { GemType } from '../types';

export class ReserveCardCommand extends GameCommand {
  constructor(
    private readonly playerId: string,
    private readonly cardId: string
  ) {
    super();
  }

  run(game: Game): void {
    this.validateGameInProgress(game);

    const player = game.getPlayer(this.playerId);
    const card = game.removeCard(this.cardId);
    const bank = game.getBank();

    if (!card) {
      throw new Error('Card not found on board');
    }

    if (player.getReservedCards().length >= 3) {
      throw new Error('Cannot reserve more than 3 cards');
    }

    if (bank.get(GemType.GOLD) > 0) {
      if (player.getTotalTokens() >= 10) {
        throw new Error('Cannot exceed 10 tokens. Must return tokens first.');
      }
    }

    player.addTokens(GemType.GOLD, 1);
    player.addReservedCard(card);

    game.advanceTurn();
    game.updateTimestamp();
  }
}
