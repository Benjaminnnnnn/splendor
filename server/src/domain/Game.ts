import { GameStatus, GemType } from './types';
import { Player } from './Player';
import { Card } from './Card';
import { Noble } from './Noble';
import { TokenBank } from './TokenBank';
import { CardDeck } from './CardDeck';

/**
 * Main Game aggregate root.
 * Encapsulates all game state and enforces game rules.
 */
export class Game {
  private players: Player[] = [];
  private currentPlayerIndex: number = 0;
  private status: GameStatus = GameStatus.WAITING_FOR_PLAYERS;
  private bank: TokenBank;
  private cardDecks: Map<number, CardDeck> = new Map();
  private nobles: Noble[] = [];
  private winner: Player | null = null;
  private endTriggered: boolean = false;
  private endTriggerPlayerIndex: number = -1;
  private endReason?: 'victory' | 'terminated';
  private endedBy?: string;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly isPrivate: boolean,
    public readonly inviteCode: string | undefined,
    public readonly createdBy: string
  ) {
    this.bank = new TokenBank();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  public initializeDecks(
    tier1Cards: Card[],
    tier2Cards: Card[],
    tier3Cards: Card[],
  ): void {
    this.cardDecks.set(1, new CardDeck(1, tier1Cards));
    this.cardDecks.set(2, new CardDeck(2, tier2Cards));
    this.cardDecks.set(3, new CardDeck(3, tier3Cards));
  }

  public setNobles(nobles: Noble[]): void {
    this.nobles = nobles;
  }

  public initializeBank(playerCount: number): void {
    let tokenCount: number;
    
    if (playerCount === 2) {
      tokenCount = 4;
    } else if (playerCount === 3) {
      tokenCount = 5;
    } else if (playerCount === 4) {
      tokenCount = 7;
    } else {
      throw new Error('Invalid player count. Must be 2-4 players.');
    }

    this.bank = new TokenBank({
      diamond: tokenCount,
      sapphire: tokenCount,
      emerald: tokenCount,
      ruby: tokenCount,
      onyx: tokenCount,
      gold: 5
    });
  }

  // ===== Player Management =====

  public addPlayer(player: Player): void {
    if (this.status !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new Error('Cannot add players after game has started');
    }
    if (this.players.length >= 4) {
      throw new Error('Game is full (maximum 4 players)');
    }
    if (this.players.some(p => p.id === player.id)) {
      throw new Error('Player already in game');
    }

    this.players.push(player);
    this.updatedAt = new Date();
  }

  public removePlayer(playerId: string): void {
    if (this.status !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new Error('Cannot remove players after game has started');
    }

    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      throw new Error('Player not found');
    }

    this.players.splice(index, 1);
    this.updatedAt = new Date();
  }

  public getPlayer(playerId: string): Player {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  }

  public getPlayers(): readonly Player[] {
    return [...this.players];
  }

  public getCurrentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  public isPlayerTurn(playerId: string): boolean {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer.id === playerId;
  }

  public start(): void {
    if (this.status !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new Error('Game has already started');
    }
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }
    if (this.players.length > 4) {
      throw new Error('Maximum 4 players allowed');
    }

    this.status = GameStatus.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public isInProgress(): boolean {
    return this.status === GameStatus.IN_PROGRESS;
  }

  public isFinished(): boolean {
    return this.status === GameStatus.FINISHED;
  }

  // ===== Turn Management =====

  public advanceTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    // Check if game should end (everyone has had equal turns after end condition)
    if (this.endTriggered && this.currentPlayerIndex === this.endTriggerPlayerIndex) {
      this.endGame();
    }
    
    this.updatedAt = new Date();
  }

  public getCurrentPlayerIndex(): number {
    return this.currentPlayerIndex;
  }

  // ===== Card Access =====

  public getCardDeck(tier: 1 | 2 | 3): CardDeck {
    const deck = this.cardDecks.get(tier);
    if (!deck) {
      throw new Error(`Card deck for tier ${tier} not found`);
    }
    return deck;
  }

  public findCard(cardId: string): Card | null {
    for (const deck of this.cardDecks.values()) {
      const card = deck.findCard(cardId);
      if (card) {
        return card;
      }
    }
    return null;
  }

  public removeCard(cardId: string): Card {
    for (const deck of this.cardDecks.values()) {
      const card = deck.removeVisibleCard(cardId);
      if (card) {
        return card;
      }
    }
    throw new Error('Card not found on board');
  }

  public getBank(): TokenBank {
    return this.bank;
  }

  public getNobles(): readonly Noble[] {
    return [...this.nobles];
  }

  public removeNoble(nobleId: string): Noble {
    const index = this.nobles.findIndex(n => n.id === nobleId);
    if (index === -1) {
      throw new Error('Noble not found');
    }
    return this.nobles.splice(index, 1)[0];
  }

  public checkNobleVisits(player: Player): Noble | null {
    const bonuses = player.getGemBonuses();
    
    for (const noble of this.nobles) {
      if (noble.meetsRequirements(bonuses)) {
        this.removeNoble(noble.id);
        return noble;
      }
    }
    
    return null;
  }

  public checkWinCondition(player: Player): void {
    if (player.hasWinningPrestige() && !this.endTriggered) {
      this.endTriggered = true;
      this.endTriggerPlayerIndex = this.currentPlayerIndex;
    }
  }

  private endGame(): void {
    this.status = GameStatus.FINISHED;
    
    // Find winner (highest prestige, ties possible)
    let maxPrestige = -1;
    let winners: Player[] = [];
    
    for (const player of this.players) {
      const prestige = player.getPrestige();
      if (prestige > maxPrestige) {
        maxPrestige = prestige;
        winners = [player];
      } else if (prestige === maxPrestige) {
        winners.push(player);
      }
    }
    
    // If tie, player with fewer cards wins
    if (winners.length > 1) {
      let minCards = Infinity;
      let finalWinner = winners[0];
      
      for (const player of winners) {
        const cardCount = player.getPurchasedCards().length;
        if (cardCount < minCards) {
          minCards = cardCount;
          finalWinner = player;
        }
      }
      
      this.winner = finalWinner;
    } else {
      this.winner = winners[0];
    }
    
    this.endReason = 'victory';
    this.updatedAt = new Date();
  }

  public terminateGame(playerId: string): void {
    this.status = GameStatus.FINISHED;
    this.endReason = 'terminated';
    this.endedBy = playerId;
    this.updatedAt = new Date();
  }

  public getWinner(): Player | null {
    return this.winner;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public updateTimestamp(): void {
    this.updatedAt = new Date();
  }
}
