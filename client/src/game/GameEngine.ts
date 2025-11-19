import { Game, Player, GameBoard, Card, TokenBank, GameState } from '../../../shared/types/game';
import { cardData } from '../../../shared/data/cards';
import { nobleData } from '../../../shared/data/nobles';
import { isValidTokenTake } from './helper';

export class GameEngine {

  initializeBoard(playerCount: number): GameBoard {
    const allCards = [...cardData];

    this.shuffleArray(allCards);

    const tier1Cards = allCards.filter(card => card.tier === 1);
    const tier2Cards = allCards.filter(card => card.tier === 2);
    const tier3Cards = allCards.filter(card => card.tier === 3);

    // Determine token count based on player count (official rules)
    let tokenCount: number;
    switch (playerCount) {
      case 2:
        tokenCount = 4;
        break;
      case 3:
        tokenCount = 5;
        break;
      case 4:
        tokenCount = 7;
        break;
      default:
        tokenCount = 4; // Default to 4 for safety
        break;
    }

    return {
      availableCards: {
        tier1: tier1Cards.splice(0, 4),
        tier2: tier2Cards.splice(0, 4),
        tier3: tier3Cards.splice(0, 4)
      },
      cardDecks: {
        tier1: tier1Cards.length,
        tier2: tier2Cards.length,
        tier3: tier3Cards.length
      },
      nobles: [],
      tokens: {
        diamond: tokenCount,
        sapphire: tokenCount,
        emerald: tokenCount,
        ruby: tokenCount,
        onyx: tokenCount,
        gold: 5
      }
    };
  }

  updateNoblesForPlayerCount(game: Game): void {
    if (!game.players || game.players.length === 0) {
      throw new Error('No players in game');
    }

    const playerCount = game.players.length;
    if (playerCount < 2 || playerCount > 4) {
      throw new Error('Invalid player count for noble setup');
    }

    const nobleCount = playerCount + 1;

    const allNobles = [...nobleData];
    this.shuffleArray(allNobles);

    if (allNobles.length < nobleCount) {
      throw new Error('Insufficient nobles for game setup');
    }

    game.board.nobles = allNobles.splice(0, nobleCount);
  }

  takeTokens(game: Game, playerId: string, tokens: Partial<TokenBank>): Game {
    if (!game || !playerId || !tokens) {
      throw new Error('Invalid parameters for takeTokens');
    }

    if (!this.isPlayerTurn(game, playerId)) {
      throw new Error('Not your turn');
    }

    if (!this.isValidTokenTake(tokens, game.board.tokens)) {
      throw new Error('Invalid token selection');
    }

    const updatedGame = this.deepClone(game);
    const updatedPlayer = this.getPlayer(updatedGame, playerId);

    Object.entries(tokens).forEach(([gem, count]) => {
      if (count && count > 0) {
        const gemType = gem as keyof TokenBank;
        updatedGame.board.tokens[gemType] -= count;
        updatedPlayer.tokens[gemType] += count;
      }
    });

    this.nextTurn(updatedGame);
    updatedGame.updatedAt = new Date();

    return updatedGame;
  }

  /**
   * Purchase a card with comprehensive validation and payment calculation
   */
  purchaseCard(game: Game, playerId: string, cardId: string, payment?: Partial<TokenBank>): Game {
    if (!game || !playerId || !cardId) {
      throw new Error('Invalid parameters for purchaseCard');
    }

    const player = this.getPlayer(game, playerId);
    if (!this.isPlayerTurn(game, playerId)) {
      throw new Error('Not your turn');
    }

    const card = this.findCard(game, cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Auto-calculate optimal payment if not provided
    if (!payment) {
      payment = this.calculateOptimalPayment(player, card);
    }

    if (!this.canAffordCard(player, card, payment)) {
      throw new Error('Cannot afford card with current resources');
    }

    const updatedGame = this.deepClone(game);
    const updatedPlayer = this.getPlayer(updatedGame, playerId);

    // Execute payment
    this.payForCard(updatedGame, updatedPlayer, payment);

    // Add card to player
    updatedPlayer.cards.push(card);
    updatedPlayer.prestige += card.prestige;

    this.removeCardFromBoard(updatedGame, card);
    this.checkNobleVisits(updatedGame, updatedPlayer);
    this.checkWinCondition(updatedGame, updatedPlayer);

    this.nextTurn(updatedGame);
    updatedGame.updatedAt = new Date();

    return updatedGame;
  }

  reserveCard(game: Game, playerId: string, cardId: string): Game {
    if (!game || !playerId || !cardId) {
      throw new Error('Invalid parameters for reserveCard');
    }

    if (!this.isPlayerTurn(game, playerId)) {
      throw new Error('Not your turn');
    }

    const card = this.findCard(game, cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    const updatedGame = this.deepClone(game);
    const updatedPlayer = this.getPlayer(updatedGame, playerId);

    updatedPlayer.tokens.gold += 1;
    updatedGame.board.tokens.gold -= 1;

    updatedPlayer.reservedCards.push(card);

    this.removeCardFromBoard(updatedGame, card);
    this.nextTurn(updatedGame);
    updatedGame.updatedAt = new Date();

    return updatedGame;
  }

  purchaseReservedCard(game: Game, playerId: string, cardId: string, payment?: Partial<TokenBank>): Game {
    if (!game || !playerId || !cardId) {
      throw new Error('Invalid parameters for purchaseReservedCard');
    }

    const player = this.getPlayer(game, playerId);
    if (!this.isPlayerTurn(game, playerId)) {
      throw new Error('Not your turn');
    }

    const cardIndex = player.reservedCards.findIndex(card => card.id === cardId);
    if (cardIndex === -1) {
      throw new Error('Card is not in your reserved cards');
    }

    const card = player.reservedCards[cardIndex];

    if (!payment) {
      payment = this.calculateOptimalPayment(player, card);
    }

    if (!this.canAffordCard(player, card, payment)) {
      throw new Error('Cannot afford this card');
    }

    const updatedGame = this.deepClone(game);
    const updatedPlayer = this.getPlayer(updatedGame, playerId);

    this.payForCard(updatedGame, updatedPlayer, payment);

    updatedPlayer.reservedCards.splice(cardIndex, 1);
    updatedPlayer.cards.push(card);
    updatedPlayer.prestige += card.prestige;

    updatedPlayer.tokens.gold = Math.max(0, updatedPlayer.tokens.gold - 1);
    updatedGame.board.tokens.gold += 1;

    this.checkNobleVisits(updatedGame, updatedPlayer);
    this.checkWinCondition(updatedGame, updatedPlayer);
    this.nextTurn(updatedGame);
    updatedGame.updatedAt = new Date();

    return updatedGame;
  }

  getPlayer(game: Game, playerId: string): Player {
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    return player;
  }

  isPlayerTurn(game: Game, playerId: string): boolean {
    if (game.state !== GameState.IN_PROGRESS) {
      return false;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    return currentPlayer && currentPlayer.id === playerId;
  }

  isValidTokenTake(tokens: Partial<TokenBank>, availableTokens: TokenBank): boolean {
    return isValidTokenTake(tokens, availableTokens);
  }

  getTotalTokens(tokens: Partial<TokenBank>): number {
    return Object.values(tokens).reduce((sum, count) => sum + (count || 0), 0);
  }

  calculateOptimalPayment(player: Player, card: Card): Partial<TokenBank> {
    const payment: Partial<TokenBank> = {};
    const playerBonuses = this.calculatePlayerBonuses(player);

    // Calculate payment for each gem type
    (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const).forEach(gem => {
      const required = card.cost[gem] || 0;
      const bonus = playerBonuses[gem] || 0;
      const needed = Math.max(0, required - bonus);

      if (needed > 0) {
        const available = player.tokens[gem] || 0;
        const fromGem = Math.min(needed, available);
        const remaining = needed - fromGem;

        if (fromGem > 0) {
          payment[gem] = fromGem;
        }

        // Use gold for remaining cost
        if (remaining > 0) {
          payment.gold = (payment.gold || 0) + remaining;
        }
      }
    });

    return payment;
  }

  canAffordCard(player: Player, card: Card, payment: Partial<TokenBank>): boolean {
    // Check if player has the tokens specified in payment
    const playerTokens = { ...player.tokens };

    for (const [gem, amount] of Object.entries(payment)) {
      if (amount && amount > 0) {
        const available = playerTokens[gem as keyof TokenBank] || 0;
        if (available < amount) {
          return false;
        }
      }
    }

    // Verify the payment actually covers the card cost
    const bonuses = this.calculatePlayerBonuses(player);
    const totalPayment: Partial<TokenBank> = { ...payment };

    // Add bonuses to effective payment
    Object.keys(bonuses).forEach(gem => {
      const gemType = gem as keyof TokenBank;
      totalPayment[gemType] = (totalPayment[gemType] || 0) + bonuses[gemType];
    });

    // Check each required gem
    return (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const).every(gem => {
      const required = card.cost[gem] || 0;
      const paid = totalPayment[gem] || 0;
      return paid >= required;
    });
  }

  calculatePlayerBonuses(player: Player): TokenBank {
    const bonuses: TokenBank = {
      diamond: 0,
      sapphire: 0,
      emerald: 0,
      ruby: 0,
      onyx: 0,
      gold: 0
    };

    player.cards.forEach(card => {
      bonuses[card.gemBonus] += 1;
    });

    return bonuses;
  }

  payForCard(game: Game, player: Player, payment: Partial<TokenBank>): void {
    Object.entries(payment).forEach(([gem, amount]) => {
      if (amount && amount > 0) {
        const gemType = gem as keyof TokenBank;
        player.tokens[gemType] -= amount;
        game.board.tokens[gemType] += amount;
      }
    });
  }

  findCard(game: Game, cardId: string): Card | null {
    // Search in available cards
    const allAvailable = [
      ...game.board.availableCards.tier1,
      ...game.board.availableCards.tier2,
      ...game.board.availableCards.tier3
    ];

    for (const card of allAvailable) {
      if (card.id === cardId) {
        return card;
      }
    }

    return null;
  }

  removeCardFromBoard(game: Game, card: Card): void {
    const { availableCards, cardDecks } = game.board;

    // Remove from available cards and replace if possible
    if (card.tier === 1) {
      const index = availableCards.tier1.findIndex(c => c.id === card.id);
      if (index !== -1) {
        availableCards.tier1.splice(index, 1);
        if (cardDecks.tier1 > 0) {
          cardDecks.tier1--;
          // Note: In a real implementation, we'd need to track the deck separately
          // For now, just decrement the count
        }
      }
    } else if (card.tier === 2) {
      const index = availableCards.tier2.findIndex(c => c.id === card.id);
      if (index !== -1) {
        availableCards.tier2.splice(index, 1);
        if (cardDecks.tier2 > 0) {
          cardDecks.tier2--;
        }
      }
    } else if (card.tier === 3) {
      const index = availableCards.tier3.findIndex(c => c.id === card.id);
      if (index !== -1) {
        availableCards.tier3.splice(index, 1);
        if (cardDecks.tier3 > 0) {
          cardDecks.tier3--;
        }
      }
    }
  }

  checkNobleVisits(game: Game, player: Player): void {
    const bonuses = this.calculatePlayerBonuses(player);

    // Check each noble to see if player qualifies
    const qualifyingNobles = game.board.nobles.filter(noble =>
      (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const).every(gem =>
        bonuses[gem] >= (noble.requirements[gem] || 0)
      )
    );

    // Award the first qualifying noble (nobles are awarded one at a time)
    if (qualifyingNobles.length > 0) {
      const noble = qualifyingNobles[0];
      player.nobles.push(noble);
      player.prestige += noble.prestige;

      // Remove noble from board
      const index = game.board.nobles.findIndex(n => n.id === noble.id);
      if (index !== -1) {
        game.board.nobles.splice(index, 1);
      }
    }
  }

  checkWinCondition(game: Game, triggeringPlayer: Player): void {
    if (triggeringPlayer.prestige >= 15 && !game.endTriggered) {
      game.endTriggered = true;
      game.endTriggerPlayerIndex = game.currentPlayerIndex;
    }

    // Check if game should end (everyone has had equal turns)
    if (game.endTriggered && game.currentPlayerIndex === game.endTriggerPlayerIndex) {
      game.state = GameState.FINISHED;

      // Find winner (highest prestige, then most cards as tiebreaker)
      const winner = game.players.reduce((prev, current) => {
        if (current.prestige > prev.prestige) {
          return current;
        } else if (current.prestige === prev.prestige && current.cards.length < prev.cards.length) {
          // Fewer cards is better in case of prestige tie
          return current;
        }
        return prev;
      });

      game.winner = winner;
    }
  }

  nextTurn(game: Game): void {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  }

  shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
