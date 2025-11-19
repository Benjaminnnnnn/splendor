import { Game } from '../domain/Game';
import { Player } from '../domain/Player';
import { Card } from '../domain/Card';
import { Noble } from '../domain/Noble';
import { CARD_DATA } from '../data/cards';
import { NOBLE_DATA } from '../data/nobles';

/**
 * Factory for creating and initializing Game instances
 */
export class GameFactory {
  /**
   * Create a new game with proper initialization
   */
  static createGame(
    gameId: string,
    createdBy: string,
    lobbyName: string,
    isPrivate: boolean = false,
    inviteCode?: string
  ): Game {
    const game = new Game(gameId, lobbyName, isPrivate, inviteCode, createdBy);
    return game;
  }

  /**
   * Initialize a game once all players have joined
   */
  static initializeGame(game: Game): void {
    const playerCount = game.getPlayers().length;
    
    if (playerCount < 2 || playerCount > 4) {
      throw new Error('Invalid player count. Must be 2-4 players.');
    }

    // Initialize token bank
    game.initializeBank(playerCount);

    // Shuffle and initialize card decks
    const tier1Cards = this.shuffleCards(CARD_DATA.filter(c => c.tier === 1));
    const tier2Cards = this.shuffleCards(CARD_DATA.filter(c => c.tier === 2));
    const tier3Cards = this.shuffleCards(CARD_DATA.filter(c => c.tier === 3));

    game.initializeDecks(tier1Cards, tier2Cards, tier3Cards);

    // Select and set nobles
    const nobleCount = this.getNobleCount(playerCount);
    const selectedNobles = this.shuffleNobles(NOBLE_DATA).slice(0, nobleCount);
    game.setNobles(selectedNobles);

    // Start the game
    game.start();
  }

  /**
   * Create a new player
   */
  static createPlayer(playerId: string, playerName: string, userId?: string): Player {
    return new Player(playerId, playerName, userId);
  }

  private static getNobleCount(playerCount: number): number {
    switch (playerCount) {
      case 2:
        return 3;
      case 3:
        return 4;
      case 4:
        return 5;
      default:
        throw new Error('Invalid player count');
    }
  }

  private static shuffleCards(cards: Card[]): Card[] {
    const shuffled = [...cards];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private static shuffleNobles(nobles: Noble[]): Noble[] {
    const shuffled = [...nobles];
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
