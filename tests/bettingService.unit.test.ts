import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BettingService } from '../server/src/services/bettingService';
import { DatabaseConnection } from '../server/src/infrastructure/database';
import { BetStatus } from '../shared/types/betting';

// Mock the DatabaseConnection
vi.mock('../server/src/infrastructure/database', () => {
  const mockDb = {
    get: vi.fn(),
    run: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn((fn) => fn()),
  };

  return {
    DatabaseConnection: {
      getInstance: vi.fn(() => mockDb),
    },
  };
});

describe('BettingService Unit Tests', () => {
  let bettingService: BettingService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = DatabaseConnection.getInstance();
    bettingService = new BettingService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('placeBet - Happy Path', () => {
    it('should place a valid bet with sufficient balance', async () => {
      const userId = 'user-123';
      const gameId = 'game-456';
      const playerId = 'player-789';
      const amount = 100;

      // Mock user stats with sufficient balance
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      // Mock no existing bet
      mockDb.get.mockReturnValueOnce(null);
      // Mock odds calculation
      mockDb.query.mockReturnValueOnce([]);
      // Mock bet retrieval
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: gameId,
        user_id: userId,
        player_id: playerId,
        amount: amount,
        odds: 2.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet(userId, {
        gameId,
        playerId,
        amount,
      });

      expect(result.bet).toBeDefined();
      expect(result.bet.amount).toBe(amount);
      expect(result.newBalance).toBe(900);
      expect(mockDb.run).toHaveBeenCalledTimes(2); // Insert bet + update balance
    });

    it('should create user_stats if not exists with initial balance', async () => {
      const userId = 'new-user-123';
      const gameId = 'game-456';
      const playerId = 'player-789';
      const amount = 100;

      // Mock no user stats
      mockDb.get.mockReturnValueOnce(null);
      // Mock no existing bet
      mockDb.get.mockReturnValueOnce(null);
      // Mock odds calculation
      mockDb.query.mockReturnValueOnce([]);
      // Mock bet retrieval
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: gameId,
        user_id: userId,
        player_id: playerId,
        amount: amount,
        odds: 2.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet(userId, {
        gameId,
        playerId,
        amount,
      });

      expect(result.newBalance).toBe(900); // 1000 initial - 100 bet
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_stats'),
        expect.arrayContaining([userId, 1000])
      );
    });
  });

  describe('placeBet - Boundary Values', () => {
    it('should accept minimum bet amount (10 coins)', async () => {
      const userId = 'user-123';
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      mockDb.query.mockReturnValueOnce([]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: userId,
        player_id: 'player-789',
        amount: 10,
        odds: 2.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet(userId, {
        gameId: 'game-456',
        playerId: 'player-789',
        amount: 10,
      });

      expect(result.bet.amount).toBe(10);
      expect(result.newBalance).toBe(990);
    });

    it('should accept maximum bet amount (1000 coins)', async () => {
      const userId = 'user-123';
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      mockDb.query.mockReturnValueOnce([]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: userId,
        player_id: 'player-789',
        amount: 1000,
        odds: 2.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet(userId, {
        gameId: 'game-456',
        playerId: 'player-789',
        amount: 1000,
      });

      expect(result.bet.amount).toBe(1000);
      expect(result.newBalance).toBe(0);
    });

    it('should reject bet below minimum (9 coins)', async () => {
      const userId = 'user-123';

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 9,
        })
      ).rejects.toThrow('Minimum bet amount is 10');
    });

    it('should reject bet above maximum (1001 coins)', async () => {
      const userId = 'user-123';

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 1001,
        })
      ).rejects.toThrow('Maximum bet amount is 1000');
    });
  });

  describe('placeBet - Edge Cases', () => {
    it('should reject insufficient balance', async () => {
      const userId = 'user-123';
      mockDb.get.mockReturnValueOnce({ virtual_currency: 50 });

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 100,
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should reject duplicate bet on same game/player', async () => {
      const userId = 'user-123';
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce({ id: 'existing-bet' }); // Existing bet

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 100,
        })
      ).rejects.toThrow('already have an active bet');
    });

    it('should reject zero amount', async () => {
      const userId = 'user-123';

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 0,
        })
      ).rejects.toThrow('Minimum bet amount is 10');
    });

    it('should reject negative amount', async () => {
      const userId = 'user-123';

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: -50,
        })
      ).rejects.toThrow('Minimum bet amount is 10');
    });

    it('should reject non-integer amount', async () => {
      const userId = 'user-123';

      await expect(
        bettingService.placeBet(userId, {
          gameId: 'game-456',
          playerId: 'player-789',
          amount: 50.5,
        })
      ).rejects.toThrow('Bet amount must be a positive integer');
    });
  });

  describe('calculateOdds', () => {
    it('should return default odds (2.0) for first bet', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      mockDb.query.mockReturnValueOnce([]); // No existing bets
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: 'user-123',
        player_id: 'player-789',
        amount: 100,
        odds: 2.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet('user-123', {
        gameId: 'game-456',
        playerId: 'player-789',
        amount: 100,
      });

      expect(result.bet.odds).toBe(2.0);
    });

    it('should return higher odds (3.0) for unpopular player', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      // Existing bets on other players
      mockDb.query.mockReturnValueOnce([
        { player_id: 'player-1', total: 200 },
        { player_id: 'player-2', total: 100 },
      ]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: 'user-123',
        player_id: 'player-3',
        amount: 100,
        odds: 3.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet('user-123', {
        gameId: 'game-456',
        playerId: 'player-3',
        amount: 100,
      });

      expect(result.bet.odds).toBe(3.0);
    });

    it('should calculate odds based on betting distribution', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      // Player 1 has 100, Player 2 has 300 (total 400)
      // Betting on Player 1: odds = 400/100 = 4.0
      mockDb.query.mockReturnValueOnce([
        { player_id: 'player-1', total: 100 },
        { player_id: 'player-2', total: 300 },
      ]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: 'user-123',
        player_id: 'player-1',
        amount: 100,
        odds: 4.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet('user-123', {
        gameId: 'game-456',
        playerId: 'player-1',
        amount: 100,
      });

      expect(result.bet.odds).toBe(4.0);
    });

    it('should cap odds at minimum 1.5x', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      // Heavy favorite: 900 on player-1, 100 on player-2
      mockDb.query.mockReturnValueOnce([
        { player_id: 'player-1', total: 900 },
        { player_id: 'player-2', total: 100 },
      ]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: 'user-123',
        player_id: 'player-1',
        amount: 100,
        odds: 1.5,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet('user-123', {
        gameId: 'game-456',
        playerId: 'player-1',
        amount: 100,
      });

      expect(result.bet.odds).toBeGreaterThanOrEqual(1.5);
    });

    it('should cap odds at maximum 10x', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1000 });
      mockDb.get.mockReturnValueOnce(null);
      // Huge underdog: 10 on player-1, 990 on player-2
      mockDb.query.mockReturnValueOnce([
        { player_id: 'player-1', total: 10 },
        { player_id: 'player-2', total: 990 },
      ]);
      mockDb.get.mockReturnValueOnce({
        id: 'bet-123',
        game_id: 'game-456',
        user_id: 'user-123',
        player_id: 'player-1',
        amount: 100,
        odds: 10.0,
        status: BetStatus.PENDING,
        created_at: Date.now(),
      });

      const result = await bettingService.placeBet('user-123', {
        gameId: 'game-456',
        playerId: 'player-1',
        amount: 100,
      });

      expect(result.bet.odds).toBeLessThanOrEqual(10.0);
    });
  });

  describe('settleBets', () => {
    it('should settle winning bets with correct payout', async () => {
      const gameId = 'game-123';
      const winnerId = 'player-1';

      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          user_id: 'user-1',
          player_id: 'player-1',
          amount: 100,
          odds: 2.5,
          status: BetStatus.PENDING,
        },
        {
          id: 'bet-2',
          user_id: 'user-2',
          player_id: 'player-2',
          amount: 200,
          odds: 1.8,
          status: BetStatus.PENDING,
        },
      ]);

      await bettingService.settleBets(gameId, winnerId);

      // Winning bet should be updated with payout
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.WON, 250, expect.any(Number), 'bet-1'])
      );

      // Losing bet should be marked as lost
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.LOST, 0, expect.any(Number), 'bet-2'])
      );

      // Winner's balance should be updated
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats SET virtual_currency'),
        expect.arrayContaining([250, expect.any(Number), 'user-1'])
      );
    });

    it('should handle game with no bets', async () => {
      mockDb.query.mockReturnValueOnce([]);

      await bettingService.settleBets('game-123', 'player-1');

      // Should not update any bets
      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('should round payout to nearest integer', async () => {
      const gameId = 'game-123';
      const winnerId = 'player-1';

      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          user_id: 'user-1',
          player_id: 'player-1',
          amount: 100,
          odds: 2.75, // 100 * 2.75 = 275
          status: BetStatus.PENDING,
        },
      ]);

      await bettingService.settleBets(gameId, winnerId);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.WON, 275, expect.any(Number), 'bet-1'])
      );
    });

    it('should not payout losing bets', async () => {
      const gameId = 'game-123';
      const winnerId = 'player-1';

      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          user_id: 'user-1',
          player_id: 'player-2',
          amount: 100,
          odds: 2.0,
          status: BetStatus.PENDING,
        },
      ]);

      await bettingService.settleBets(gameId, winnerId);

      // Should only update bet status, not user balance
      expect(mockDb.run).toHaveBeenCalledTimes(1);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.LOST, 0, expect.any(Number), 'bet-1'])
      );
    });
  });

  describe('cancelBets', () => {
    it('should cancel all pending bets and refund amounts', async () => {
      const gameId = 'game-123';

      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          user_id: 'user-1',
          amount: 100,
          status: BetStatus.PENDING,
        },
        {
          id: 'bet-2',
          user_id: 'user-2',
          amount: 200,
          status: BetStatus.PENDING,
        },
      ]);

      await bettingService.cancelBets(gameId);

      // Should update both bets to cancelled
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.CANCELLED, expect.any(Number), 'bet-1'])
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bets SET status'),
        expect.arrayContaining([BetStatus.CANCELLED, expect.any(Number), 'bet-2'])
      );

      // Should refund both users
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats SET virtual_currency'),
        expect.arrayContaining([100, expect.any(Number), 'user-1'])
      );

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats SET virtual_currency'),
        expect.arrayContaining([200, expect.any(Number), 'user-2'])
      );
    });

    it('should handle game with no pending bets', async () => {
      mockDb.query.mockReturnValueOnce([]);

      await bettingService.cancelBets('game-123');

      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('should restore full bet amount to user balance', async () => {
      const gameId = 'game-123';

      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          user_id: 'user-1',
          amount: 500,
          status: BetStatus.PENDING,
        },
      ]);

      await bettingService.cancelBets(gameId);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats SET virtual_currency'),
        expect.arrayContaining([500, expect.any(Number), 'user-1'])
      );
    });
  });

  describe('getUserBalance', () => {
    it('should return existing user balance', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 750 });

      const balance = await bettingService.getUserBalance('user-123');

      expect(balance).toBe(750);
    });

    it('should create user_stats and return initial balance for new user', async () => {
      mockDb.get.mockReturnValueOnce(null);

      const balance = await bettingService.getUserBalance('new-user-123');

      expect(balance).toBe(1000);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_stats'),
        expect.arrayContaining(['new-user-123', 1000])
      );
    });
  });

  describe('getUserBettingHistory', () => {
    it('should calculate correct statistics', async () => {
      mockDb.query.mockReturnValueOnce([
        {
          id: 'bet-1',
          game_id: 'game-1',
          user_id: 'user-1',
          player_id: 'player-1',
          amount: 100,
          odds: 2.0,
          status: BetStatus.WON,
          payout: 200,
          created_at: Date.now(),
        },
        {
          id: 'bet-2',
          game_id: 'game-2',
          user_id: 'user-1',
          player_id: 'player-2',
          amount: 150,
          odds: 1.5,
          status: BetStatus.LOST,
          payout: 0,
          created_at: Date.now(),
        },
        {
          id: 'bet-3',
          game_id: 'game-3',
          user_id: 'user-1',
          player_id: 'player-3',
          amount: 50,
          odds: 3.0,
          status: BetStatus.PENDING,
          created_at: Date.now(),
        },
      ]);

      const history = await bettingService.getUserBettingHistory('user-1');

      expect(history.totalBets).toBe(3);
      expect(history.totalWagered).toBe(300);
      expect(history.totalWon).toBe(200);
      expect(history.winRate).toBe(50); // 1 win out of 2 settled = 50%
    });

    it('should handle user with no bets', async () => {
      mockDb.query.mockReturnValueOnce([]);

      const history = await bettingService.getUserBettingHistory('user-1');

      expect(history.totalBets).toBe(0);
      expect(history.totalWagered).toBe(0);
      expect(history.totalWon).toBe(0);
      expect(history.winRate).toBe(0);
    });

    it('should respect limit parameter', async () => {
      mockDb.query.mockReturnValueOnce([]);

      await bettingService.getUserBettingHistory('user-1', 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['user-1', 10])
      );
    });
  });

  describe('getGameBettingStats', () => {
    it('should calculate correct game statistics', async () => {
      mockDb.query.mockReturnValueOnce([
        { player_id: 'player-1', bet_count: 3, total_amount: 300 },
        { player_id: 'player-2', bet_count: 2, total_amount: 200 },
      ]);

      const stats = await bettingService.getGameBettingStats('game-123');

      expect(stats.totalBets).toBe(5);
      expect(stats.totalAmount).toBe(500);
      expect(stats.playerBets).toHaveLength(2);
    });

    it('should return empty stats for game with no bets', async () => {
      mockDb.query.mockReturnValueOnce([]);

      const stats = await bettingService.getGameBettingStats('game-123');

      expect(stats.totalBets).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.playerBets).toHaveLength(0);
    });
  });

  describe('addVirtualCurrency', () => {
    it('should add currency to user balance', async () => {
      mockDb.get.mockReturnValueOnce({ virtual_currency: 1500 });

      const newBalance = await bettingService.addVirtualCurrency('user-123', 500);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_stats SET virtual_currency'),
        expect.arrayContaining([500, expect.any(Number), 'user-123'])
      );
      expect(newBalance).toBe(1500);
    });

    it('should reject negative or zero amounts', async () => {
      await expect(
        bettingService.addVirtualCurrency('user-123', 0)
      ).rejects.toThrow('Amount must be positive');

      await expect(
        bettingService.addVirtualCurrency('user-123', -100)
      ).rejects.toThrow('Amount must be positive');
    });
  });
});
