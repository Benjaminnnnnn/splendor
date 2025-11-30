import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BettingService } from '../server/src/services/bettingService';
import { DatabaseConnection } from '../server/src/infrastructure/database';
import { BetStatus } from '../shared/types/betting';

describe.sequential('BettingService', () => {
  let bettingService: BettingService;
  let db: DatabaseConnection;
  let testUserId: string;
  let testGameId: string;
  let testPlayerId: string;

  beforeEach(async () => {
    bettingService = new BettingService();
    db = DatabaseConnection.getInstance();
    
    // Create test user with unique identifiers
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    testUserId = `test-user-${timestamp}-${random}`;
    testGameId = `test-game-${timestamp}-${random}`;
    testPlayerId = `test-player-${timestamp}-${random}`;
    
    // Add delay to avoid database contention in parallel tests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [testUserId, `testuser${timestamp}`, `test${timestamp}${random}@example.com`, 'hash', timestamp]
    );
    
    db.run(
      'INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [testUserId, 1000, timestamp, timestamp]
    );
  });

  afterEach(async () => {
    // Clean up test data with delay to avoid I/O contention
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      db.run('DELETE FROM bets WHERE game_id = ?', [testGameId]);
    } catch (error) {
      // Ignore cleanup errors
    }
    try {
      db.run('DELETE FROM user_stats WHERE user_id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
    try {
      db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('placeBet', () => {
    it('should successfully place a valid bet', async () => {
      const result = await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      });

      expect(result.bet).toBeDefined();
      expect(result.bet.amount).toBe(100);
      expect(result.bet.game_id).toBe(testGameId);
      expect(result.bet.player_id).toBe(testPlayerId);
      expect(result.bet.status).toBe(BetStatus.PENDING);
      expect(result.newBalance).toBe(900);
    });

    it('should reject bet below minimum amount', async () => {
      await expect(
        bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 5
        })
      ).rejects.toThrow('Minimum bet amount');
    });

    it('should reject bet above maximum amount', async () => {
      await expect(
        bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 1500
        })
      ).rejects.toThrow('Maximum bet amount');
    });

    it('should reject bet with insufficient balance', async () => {
      // User has 1000 balance, so betting 1001 should fail
      await expect(
        bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 1001
        })
      ).rejects.toThrow();
    });

    it('should reject negative bet amount', async () => {
      await expect(
        bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: -50
        })
      ).rejects.toThrow('Minimum bet amount');
    });

    it('should reject duplicate bet on same game', async () => {
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      });

      await expect(
        bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 50
        })
      ).rejects.toThrow('already have an active bet');
    });

    it('should deduct bet amount from user balance', async () => {
      const initialBalance = await bettingService.getUserBalance(testUserId);
      
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 200
      });

      const newBalance = await bettingService.getUserBalance(testUserId);
      expect(newBalance).toBe(initialBalance - 200);
    });
  });

  describe('settleBets', () => {
    it('should settle winning bets correctly', async () => {
      const betAmount = 100;
      const result = await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: betAmount
      });

      const initialBalance = await bettingService.getUserBalance(testUserId);
      
      await bettingService.settleBets(testGameId, testPlayerId);

      const bet = await bettingService.getBetById(result.bet.id);
      expect(bet?.status).toBe(BetStatus.WON);
      expect(bet?.payout).toBeGreaterThan(0);

      const finalBalance = await bettingService.getUserBalance(testUserId);
      expect(finalBalance).toBe(initialBalance + (bet?.payout || 0));
    });

    it('should settle losing bets correctly', async () => {
      const betAmount = 100;
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: betAmount
      });

      const initialBalance = await bettingService.getUserBalance(testUserId);
      
      // Settle with different winner
      await bettingService.settleBets(testGameId, 'different-player-id');

      const bets = await bettingService.getBetsByGame(testGameId);
      expect(bets[0].status).toBe(BetStatus.LOST);
      expect(bets[0].payout).toBe(0);

      const finalBalance = await bettingService.getUserBalance(testUserId);
      expect(finalBalance).toBe(initialBalance); // No payout for losing bet
    });

    it('should handle multiple bets on same game', async () => {
      // Create another test user
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const testUserId2 = `test-user-2-${timestamp}-${random}`;
      
      try {
        db.run(
          'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
          [testUserId2, `testuser2${timestamp}`, `test2${timestamp}${random}@example.com`, 'hash', timestamp]
        );
        db.run(
          'INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [testUserId2, 1000, timestamp, timestamp]
        );

        await bettingService.placeBet(testUserId, {
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

        await bettingService.placeBet(testUserId2, {
          gameId: testGameId,
          playerId: 'other-player',
          amount: 150
        });

        await bettingService.settleBets(testGameId, testPlayerId);

        const bets = await bettingService.getBetsByGame(testGameId);
        expect(bets).toHaveLength(2);
        expect(bets.filter(b => b.status === BetStatus.WON)).toHaveLength(1);
        expect(bets.filter(b => b.status === BetStatus.LOST)).toHaveLength(1);
      } finally {
        // Clean up second user
        try {
          db.run('DELETE FROM user_stats WHERE user_id = ?', [testUserId2]);
        } catch (e) {
          // Ignore
        }
        try {
          db.run('DELETE FROM users WHERE id = ?', [testUserId2]);
        } catch (e) {
          // Ignore
        }
      }
    });
  });

  describe('cancelBets', () => {
    it('should cancel all pending bets and refund users', async () => {
      const betAmount = 100;
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: betAmount
      });

      const balanceAfterBet = await bettingService.getUserBalance(testUserId);
      
      await bettingService.cancelBets(testGameId);

      const bets = await bettingService.getBetsByGame(testGameId);
      expect(bets[0].status).toBe(BetStatus.CANCELLED);

      const finalBalance = await bettingService.getUserBalance(testUserId);
      expect(finalBalance).toBe(balanceAfterBet + betAmount);
    });
  });

  describe('getGameBettingStats', () => {
    it('should return correct betting statistics', async () => {
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      });

      const stats = await bettingService.getGameBettingStats(testGameId);
      
      expect(stats.gameId).toBe(testGameId);
      expect(stats.totalBets).toBe(1);
      expect(stats.totalAmount).toBe(100);
      expect(stats.playerBets).toHaveLength(1);
      expect(stats.playerBets[0].playerId).toBe(testPlayerId);
      expect(stats.playerBets[0].totalAmount).toBe(100);
    });

    it('should return empty stats for game with no bets', async () => {
      const stats = await bettingService.getGameBettingStats('no-bets-game');
      
      expect(stats.totalBets).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.playerBets).toHaveLength(0);
    });
  });

  describe('getUserBettingHistory', () => {
    it('should return user betting history', async () => {
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      });

      const history = await bettingService.getUserBettingHistory(testUserId);
      
      expect(history.userId).toBe(testUserId);
      expect(history.totalBets).toBe(1);
      expect(history.totalWagered).toBe(100);
      expect(history.bets).toHaveLength(1);
    });

    it('should calculate win rate correctly', async () => {
      // Place bet and settle as winner
      await bettingService.placeBet(testUserId, {
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      });
      await bettingService.settleBets(testGameId, testPlayerId);

      const history = await bettingService.getUserBettingHistory(testUserId);
      
      expect(history.winRate).toBe(100);
    });
  });

  describe('getUserBalance', () => {
    it('should return correct user balance', async () => {
      const balance = await bettingService.getUserBalance(testUserId);
      expect(balance).toBe(1000);
    });

    it('should return initial balance for non-existent user', async () => {
      const uniqueUserId = 'non-existent-' + Date.now() + '-' + Math.random();
      const balance = await bettingService.getUserBalance(uniqueUserId);
      expect(balance).toBe(1000);
    });
  });

  describe('addVirtualCurrency', () => {
    it('should add virtual currency to user balance', async () => {
      const initialBalance = await bettingService.getUserBalance(testUserId);
      
      const newBalance = await bettingService.addVirtualCurrency(testUserId, 500);
      
      expect(newBalance).toBe(initialBalance + 500);
    });

    it('should reject negative amounts', async () => {
      await expect(
        bettingService.addVirtualCurrency(testUserId, -100)
      ).rejects.toThrow('Amount must be positive');
    });
  });
});
