import { v4 as uuidv4 } from 'uuid';
import { Game, GameFactory, Player, Card } from '../domain';
import {
  TakeTokensCommand,
  PurchaseCardCommand,
  ReserveCardCommand,
  PurchaseReservedCardCommand,
} from '../domain/commands';
import { DomainToDTOMapper } from '../api/mappers';
import { GameStateDTO, TokenBankDTO } from '../api/dtos';
import { GameStatus } from '../domain/types';
import { configDefaults } from 'vitest/config';
import { CARD_DATA } from '../data/cards';
import { NOBLE_DATA } from '../data/nobles';
import { NotificationService } from './notificationService';
import { BettingService } from './bettingService';

export interface GameJoinResponse {
  game: GameStateDTO;
  playerId: string;
}

export interface CreateGameRequest {
  playerName: string;
  lobbyName: string;
  isPrivate?: boolean;
  userId?: string;
}

export interface JoinGameRequest {
  playerName: string;
  userId?: string;
}

export class GameService {
  private games: Map<string, Game> = new Map();
  private gameStartTimes: Map<string, Date> = new Map();
  private inviteCodeToGameId: Map<string, string> = new Map();
  private notificationService: NotificationService;
  private bettingService: BettingService;

  constructor() {
    this.notificationService = new NotificationService();
    this.bettingService = new BettingService();
  }

  async createGame(request: CreateGameRequest): Promise<GameJoinResponse> {
    console.log('[GameService] Creating game with request:', { playerName: request.playerName, userId: request.userId, lobbyName: request.lobbyName });
    const gameId = uuidv4();
    const playerId = uuidv4();
    const isPrivate = false;
    let inviteCode: string | undefined;

    const game = GameFactory.createGame(
      gameId,
      playerId,
      request.lobbyName,
      isPrivate,
      inviteCode
    );

    const player = GameFactory.createPlayer(
      playerId,
      request.playerName,
      request.userId
    );
    console.log('[GameService] Created player:', { id: player.id, name: player.name, userId: player.getUserId() });
    game.addPlayer(player);

    this.games.set(gameId, game);

    const gameDTO = DomainToDTOMapper.mapGame(game);
    return { game: gameDTO, playerId };
  }

  async getGame(gameId: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);
    return DomainToDTOMapper.mapGame(game);
  }

  async joinGame(gameId: string, request: JoinGameRequest): Promise<GameJoinResponse> {
    const game = this.getGameDomain(gameId);

    if (game.getPlayers().length >= 4) {
      throw new Error('Game is full');
    }

    if (game.getStatus() !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new Error('Game has already started');
    }

    const playerId = uuidv4();
    const player = GameFactory.createPlayer(
      playerId,
      request.playerName,
      request.userId
    );

    game.addPlayer(player);

    // Game will be initialized when the host explicitly starts it
    // No automatic start when players join

    // Convert to DTO for response
    const gameDTO = DomainToDTOMapper.mapGame(game);
    return { game: gameDTO, playerId };
  }

  async leaveGame(gameId: string, playerId: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    game.removePlayer(playerId);

    if (game.getPlayers().length === 0) {
      this.games.delete(gameId);
      this.gameStartTimes.delete(gameId);
    }

    return DomainToDTOMapper.mapGame(game);
  }

  async kickPlayer(gameId: string, hostPlayerId: string, playerIdToKick: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    // Verify that the requester is the host (first player)
    const players = game.getPlayers();
    if (players.length === 0 || players[0].id !== hostPlayerId) {
      throw new Error('Only the host can kick players');
    }

    // Prevent host from kicking themselves
    if (hostPlayerId === playerIdToKick) {
      throw new Error('Host cannot kick themselves');
    }

    game.removePlayer(playerIdToKick);

    return DomainToDTOMapper.mapGame(game);
  }

  async listGames(): Promise<GameStateDTO[]> {
    return Array.from(this.games.values()).map(game => DomainToDTOMapper.mapGame(game));
  }

  async joinGameByInviteCode(inviteCode: string, request: JoinGameRequest): Promise<GameJoinResponse> {
    const gameId = this.inviteCodeToGameId.get(inviteCode);
    if (!gameId) {
      throw new Error('Invalid invite code');
    }
    return this.joinGame(gameId, request);
  }

  async takeTokens(gameId: string, playerId: string, tokens: Partial<TokenBankDTO>): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    const command = new TakeTokensCommand(playerId, tokens);
    command.run(game);

    // Notify next player if game is still ongoing
    await this.notifyNextPlayer(game);

    return DomainToDTOMapper.mapGame(game);
  }

  async purchaseCard(gameId: string, playerId: string, cardId: string, payment?: Partial<TokenBankDTO>): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    const command = new PurchaseCardCommand(playerId, cardId, payment);
    command.run(game);

    // Check if game ended and update statistics if needed
    if (game.isFinished() && game.getWinner()) {
      await this.handleGameCompletion(game);
    } else {
      // Notify next player if game is still ongoing
      await this.notifyNextPlayer(game);
    }

    return DomainToDTOMapper.mapGame(game);
  }

  async reserveCard(gameId: string, playerId: string, cardId: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    const command = new ReserveCardCommand(playerId, cardId);
    command.run(game);

    // Notify next player if game is still ongoing
    await this.notifyNextPlayer(game);

    return DomainToDTOMapper.mapGame(game);
  }

  async purchaseReservedCard(gameId: string, playerId: string, cardId: string, payment?: Partial<TokenBankDTO>): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    const command = new PurchaseReservedCardCommand(playerId, cardId, payment);
    command.run(game);

    // Check if game ended and update statistics if needed
    if (game.isFinished() && game.getWinner()) {
      await this.handleGameCompletion(game);
    } else {
      // Notify next player if game is still ongoing
      await this.notifyNextPlayer(game);
    }

    return DomainToDTOMapper.mapGame(game);
  }

  async startGame(gameId: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    if (game.getStatus() !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new Error('Game has already started or ended');
    }

    if (game.getPlayers().length < 2) {
      throw new Error('Need at least 2 players to start the game');
    }

    // Initialize the game (deal cards, set up nobles, etc.)
    GameFactory.initializeGame(game);
    
    // Track game start time for statistics
    this.gameStartTimes.set(gameId, new Date());

    // Notify all players that the game has started
    const players = game.getPlayers();
    for (const player of players) {
      if (player.userId) {
        try {
          await this.notificationService.notifyGameStarted(player.userId, gameId);
        } catch (error) {
          console.error(`Failed to send game started notification to user ${player.userId}:`, error);
          // Don't fail the game start if notification fails
        }
      }
    }

    // Notify the first player that it's their turn
    const currentPlayer = players[game.getCurrentPlayerIndex()];
    if (currentPlayer?.userId) {
      try {
        await this.notificationService.notifyTurnReminder(currentPlayer.userId, gameId);
      } catch (error) {
        console.error(`Failed to send turn reminder to user ${currentPlayer.userId}:`, error);
      }
    }

    return DomainToDTOMapper.mapGame(game);
  }

  async endGame(gameId: string, playerId: string): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    // Verify the player is in the game
    const player = game.getPlayers().find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not in game');
    }

    // Mark game as terminated
    game.terminateGame(playerId);

    // Update statistics even for terminated games
    await this.handleGameCompletion(game);

    return DomainToDTOMapper.mapGame(game);
  }

  private async handleGameCompletion(game: Game): Promise<void> {
    try {
      const gameStartTime = this.gameStartTimes.get(game.id);
      const gameEndTime = new Date();
      const durationSeconds = gameStartTime
        ? Math.round((gameEndTime.getTime() - gameStartTime.getTime()) / 1000)
        : 0;

      // Convert to DTO for stats service (which still uses old types)
      const gameDTO = DomainToDTOMapper.mapGame(game);

      // Settle bets if there's a winner
      const winner = game.getWinner();
      if (winner) {
        try {
          await this.bettingService.settleBets(game.id, winner.id);
          console.log(`[GameService] Settled bets for game ${game.id}, winner: ${winner.name}`);
        } catch (error) {
          console.error(`Failed to settle bets for game ${game.id}:`, error);
        }
      } else {
        // If game was terminated without a winner, cancel all bets
        try {
          await this.bettingService.cancelBets(game.id);
          console.log(`[GameService] Cancelled bets for terminated game ${game.id}`);
        } catch (error) {
          console.error(`Failed to cancel bets for game ${game.id}:`, error);
        }
      }

      // Notify all players about game ending
      const players = game.getPlayers();
      for (const player of players) {
        if (player.userId) {
          const won = winner?.id === player.id;
          try {
            await this.notificationService.notifyGameEnded(player.userId, game.id, won);
          } catch (error) {
            console.error(`Failed to send game ended notification to user ${player.userId}:`, error);
          }
        }
      }

      // Clean up tracking data
      this.gameStartTimes.delete(game.id);

      console.log(`Game ${game.id} completed. Duration: ${durationSeconds}s, Winner: ${winner?.name || 'None'}`);
    } catch (error) {
      console.error(`Failed to handle game completion for ${game.id}:`, error);
    }
  }

  /**
   * Helper method to notify the next player that it's their turn
   */
  private async notifyNextPlayer(game: Game): Promise<void> {
    try {
      // Only notify if game is still in progress
      if (game.getStatus() !== GameStatus.IN_PROGRESS) {
        return;
      }

      const currentPlayer = game.getPlayers()[game.getCurrentPlayerIndex()];
      if (currentPlayer?.userId) {
        await this.notificationService.notifyTurnReminder(currentPlayer.userId, game.id);
      }
    } catch (error) {
      console.error(`Failed to send turn reminder:`, error);
      // Don't fail the action if notification fails
    }
  }

  /**
   * Helper method to get domain Game object
   */
  private getGameDomain(gameId: string): Game {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  }

  /**
   * Set custom game state for testing purposes
   * WARNING: Only for use in development/test environments
   */
  async setGameState(gameId: string, customState: any): Promise<GameStateDTO> {
    const game = this.getGameDomain(gameId);

    // Update current player index if provided
    if (customState.currentPlayerIndex !== undefined) {
      // Use reflection to set private field for testing
      (game as any).currentPlayerIndex = customState.currentPlayerIndex;
    }

    // Update player states if provided
    if (customState.players && Array.isArray(customState.players)) {
      for (const playerUpdate of customState.players) {
        const player = game.getPlayer(playerUpdate.id);
        
        // Update tokens
        if (playerUpdate.tokens) {
          const tokenBank = player.getTokenBank();
          for (const [gemType, amount] of Object.entries(playerUpdate.tokens)) {
            if (typeof amount === 'number') {
              tokenBank.set(gemType as any, amount);
            }
          }
        }

        // Update purchased cards
        if (playerUpdate.cards && Array.isArray(playerUpdate.cards)) {
          // Clear existing cards
          (player as any).purchasedCards = [];
          (player as any).prestigePoints = 0; // Reset prestige to recalculate
          
          // Add specified cards
          for (const cardId of playerUpdate.cards) {
            const card = CARD_DATA.find(c => c.id === cardId);
            if (card) {
              player.addPurchasedCard(card);
            }
          }
        }

        // Update reserved cards
        if (playerUpdate.reservedCards && Array.isArray(playerUpdate.reservedCards)) {
          // Clear existing reserved cards
          (player as any).reservedCards = [];
          
          // Add specified cards
          for (const cardId of playerUpdate.reservedCards) {
            const card = CARD_DATA.find(c => c.id === cardId);
            if (card) {
              (player as any).reservedCards.push(card);
            }
          }
        }

        // Update nobles
        if (playerUpdate.nobles && Array.isArray(playerUpdate.nobles)) {
          // Clear existing nobles
          (player as any).nobles = [];
          
          // Add specified nobles
          for (const nobleId of playerUpdate.nobles) {
            const noble = NOBLE_DATA.find(n => n.id === nobleId);
            if (noble) {
              player.addNoble(noble);
            }
          }
        }
      }
    }

    // Update board state if provided
    if (customState.board) {
      // Update bank tokens
      if (customState.board.tokens) {
        const bank = game.getBank();
        for (const [gemType, amount] of Object.entries(customState.board.tokens)) {
          if (typeof amount === 'number') {
            bank.set(gemType as any, amount);
          }
        }
      }

      // Update available cards on the board
      if (customState.board.availableCards) {
        // For each tier, set the specific visible cards
        for (const tier of [1, 2, 3] as const) {
          const tierKey = `tier${tier}` as 'tier1' | 'tier2' | 'tier3';
          const cardIds = customState.board.availableCards[tierKey];
          
          if (cardIds && Array.isArray(cardIds)) {
            const deck = game.getCardDeck(tier);
            
            // Clear existing visible cards and set new ones
            // We need to directly manipulate the deck's internal state
            const visibleCards: Card[] = [];
            const deckCards: Card[] = [];
            
            // Add the specified cards as visible
            for (const cardId of cardIds) {
              const card = CARD_DATA.find(c => c.id === cardId);
              if (card) {
                visibleCards.push(card);
              }
            }
            
            // Get remaining cards for the deck (cards not in the visible list)
            const allCardsForTier = CARD_DATA.filter(c => c.tier === tier);
            for (const card of allCardsForTier) {
              if (!cardIds.includes(card.id)) {
                deckCards.push(card);
              }
            }
            
            // Directly set the deck's internal state using reflection
            (deck as any).visible = visibleCards;
            (deck as any).deck = deckCards;
          }
        }
      }
    }

    // Update the timestamp
    (game as any).updatedAt = new Date();

    return DomainToDTOMapper.mapGame(game);
  }

  // Method to clean up old games
  public cleanupOldGames(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));

    for (const [gameId, game] of this.games.entries()) {
      if (game.getUpdatedAt() < cutoffTime) {
        this.games.delete(gameId);
        this.gameStartTimes.delete(gameId);
        console.log(`Cleaned up old game: ${gameId}`);
      }
    }
  }
}
