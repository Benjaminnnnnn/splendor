import { Game } from '../Game';

export abstract class GameCommand {
  abstract run(game: Game): void;

  protected validateGameInProgress(game: Game): void {
    if (!game.isInProgress()) {
      throw new Error('Game is not in progress');
    }
  }

  protected validatePlayerTurn(game: Game, playerId: string): void {
    if (!game.isPlayerTurn(playerId)) {
      throw new Error('Not your turn');
    }
  }
}
