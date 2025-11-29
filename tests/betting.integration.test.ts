import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bettingRoutes from '../server/src/routes/bettingRoutes';
import { DatabaseConnection } from '../server/src/infrastructure/database';

describe('Betting API Integration Tests', () => {
  let app: express.Application;
  let db: DatabaseConnection;
  let testUserId: string;
  let testGameId: string;
  let testPlayerId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bets', bettingRoutes);
    
    db = DatabaseConnection.getInstance();
  });

  beforeEach(() => {
    // Create test data
    testUserId = 'test-user-' + Date.now();
    testGameId = 'test-game-' + Date.now();
    testPlayerId = 'test-player-' + Date.now();
    
    const now = Date.now();
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [testUserId, 'testuser', `test${now}@example.com`, 'hash', now]
    );
    
    db.run(
      'INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [testUserId, 1000, now, now]
    );
  });

  afterAll(() => {
    // Clean up all test data
    db.run('DELETE FROM bets WHERE game_id LIKE ?', ['test-game-%']);
    db.run('DELETE FROM user_stats WHERE user_id LIKE ?', ['test-user-%']);
    db.run('DELETE FROM users WHERE id LIKE ?', ['test-user-%']);
  });

  describe('POST /api/bets', () => {
    it('should place a bet successfully', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.bet).toBeDefined();
      expect(response.body.bet.amount).toBe(100);
      expect(response.body.newBalance).toBe(900);
    });

    it('should return 400 for invalid bet amount', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 5 // Below minimum
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Minimum bet amount');
    });

    it('should return 400 for insufficient balance', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 1500 // More than balance
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Insufficient balance');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId
          // Missing playerId and amount
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 401 for missing userId', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('User ID required');
    });
  });

  describe('GET /api/bets/game/:gameId/stats', () => {
    it('should return betting stats for a game', async () => {
      // Place a bet first
      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      const response = await request(app)
        .get(`/api/bets/game/${testGameId}/stats`);

      expect(response.status).toBe(200);
      expect(response.body.gameId).toBe(testGameId);
      expect(response.body.totalBets).toBe(1);
      expect(response.body.totalAmount).toBe(100);
      expect(response.body.playerBets).toHaveLength(1);
    });

    it('should return empty stats for game with no bets', async () => {
      const response = await request(app)
        .get('/api/bets/game/no-bets-game/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalBets).toBe(0);
      expect(response.body.totalAmount).toBe(0);
    });
  });

  describe('GET /api/bets/game/:gameId', () => {
    it('should return all bets for a game', async () => {
      // Place a bet
      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      const response = await request(app)
        .get(`/api/bets/game/${testGameId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].game_id).toBe(testGameId);
    });
  });

  describe('GET /api/bets/user/:userId/history', () => {
    it('should return user betting history', async () => {
      // Place a bet
      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      const response = await request(app)
        .get(`/api/bets/user/${testUserId}/history`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.totalBets).toBe(1);
      expect(response.body.totalWagered).toBe(100);
      expect(response.body.bets).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get(`/api/bets/user/${testUserId}/history?limit=5`);

      expect(response.status).toBe(200);
      expect(response.body.bets.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/bets/user/:userId/balance', () => {
    it('should return user balance', async () => {
      const response = await request(app)
        .get(`/api/bets/user/${testUserId}/balance`);

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(1000);
    });

    it('should return 0 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/bets/user/non-existent/balance');

      expect(response.status).toBe(200);
      expect(response.body.balance).toBe(0);
    });
  });

  describe('GET /api/bets/:betId', () => {
    it('should return a specific bet', async () => {
      // Place a bet
      const placeBetResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      const betId = placeBetResponse.body.bet.id;

      const response = await request(app)
        .get(`/api/bets/${betId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(betId);
      expect(response.body.amount).toBe(100);
    });

    it('should return 404 for non-existent bet', async () => {
      const response = await request(app)
        .get('/api/bets/non-existent-bet-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Bet not found');
    });
  });

  describe('Bet workflow', () => {
    it('should handle complete bet lifecycle', async () => {
      // 1. Check initial balance
      let balanceResponse = await request(app)
        .get(`/api/bets/user/${testUserId}/balance`);
      expect(balanceResponse.body.balance).toBe(1000);

      // 2. Place bet
      const placeBetResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 200
        });
      expect(placeBetResponse.status).toBe(201);
      expect(placeBetResponse.body.newBalance).toBe(800);

      // 3. Check balance after bet
      balanceResponse = await request(app)
        .get(`/api/bets/user/${testUserId}/balance`);
      expect(balanceResponse.body.balance).toBe(800);

      // 4. Check game stats
      const statsResponse = await request(app)
        .get(`/api/bets/game/${testGameId}/stats`);
      expect(statsResponse.body.totalAmount).toBe(200);

      // 5. Check user history
      const historyResponse = await request(app)
        .get(`/api/bets/user/${testUserId}/history`);
      expect(historyResponse.body.totalWagered).toBe(200);
    });
  });

  describe('Boundary Value Tests', () => {
    it('should accept exactly 10 coins (minimum)', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 10
        });

      expect(response.status).toBe(201);
      expect(response.body.bet.amount).toBe(10);
      expect(response.body.newBalance).toBe(990);
    });

    it('should accept exactly 1000 coins (maximum)', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body.bet.amount).toBe(1000);
      expect(response.body.newBalance).toBe(0);
    });

    it('should reject 9 coins (below minimum)', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 9
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Minimum bet amount');
    });

    it('should reject 1001 coins (above maximum)', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 1001
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum bet amount');
    });
  });

  describe('Edge Cases - Invalid Amounts', () => {
    it('should reject zero amount', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive integer');
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: -50
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive integer');
    });

    it('should reject non-integer amount (decimal)', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 50.5
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positive integer');
    });
  });

  describe('Edge Cases - Duplicate Bets', () => {
    it('should prevent duplicate bet on same game and player', async () => {
      // Place first bet
      const firstResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });
      expect(firstResponse.status).toBe(201);

      // Try to place duplicate bet
      const secondResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 50
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.error).toContain('already have an active bet');
    });

    it('should allow bet on different player in same game', async () => {
      const player2Id = testPlayerId + '-2';

      // Place first bet on player 1
      const firstResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });
      expect(firstResponse.status).toBe(201);

      // Place second bet on player 2 in same game
      const secondResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: player2Id,
          amount: 100
        });

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.bet.player_id).toBe(player2Id);
    });
  });

  describe('Edge Cases - New User Initialization', () => {
    it('should auto-create user_stats with 1000 balance for new user', async () => {
      const newUserId = 'new-user-' + Date.now();
      const now = Date.now();
      
      // Create user without user_stats
      db.run(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        [newUserId, 'newuser', `new${now}@example.com`, 'hash', now]
      );

      // Check balance (should auto-create with 1000)
      const balanceResponse = await request(app)
        .get(`/api/bets/user/${newUserId}/balance`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.balance).toBe(1000);

      // Verify user can place bet
      const betResponse = await request(app)
        .post('/api/bets')
        .send({
          userId: newUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      expect(betResponse.status).toBe(201);
      expect(betResponse.body.newBalance).toBe(900);
    });
  });

  describe('Edge Cases - Empty Betting Pool', () => {
    it('should handle first bet on a game with default odds', async () => {
      const response = await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.bet.odds).toBe(2.0); // Default odds for first bet
    });
  });

  describe('Multiple Users - Odds Calculation', () => {
    it('should adjust odds dynamically based on betting distribution', async () => {
      // Create second user
      const user2Id = 'test-user-2-' + Date.now();
      const now = Date.now();
      db.run(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        [user2Id, 'testuser2', `test2${now}@example.com`, 'hash', now]
      );
      db.run(
        'INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [user2Id, 1000, now, now]
      );

      const player2Id = testPlayerId + '-2';

      // User 1 bets 300 on player 1
      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 300
        });

      // User 2 bets 100 on player 2
      await request(app)
        .post('/api/bets')
        .send({
          userId: user2Id,
          gameId: testGameId,
          playerId: player2Id,
          amount: 100
        });

      // Check stats - odds should reflect distribution
      const statsResponse = await request(app)
        .get(`/api/bets/game/${testGameId}/stats`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.totalAmount).toBe(400);
      expect(statsResponse.body.playerBets).toHaveLength(2);

      // Player 1 (300 bet) should have lower odds
      const player1Stats = statsResponse.body.playerBets.find(
        (p: any) => p.playerId === testPlayerId
      );
      // Player 2 (100 bet) should have higher odds
      const player2Stats = statsResponse.body.playerBets.find(
        (p: any) => p.playerId === player2Id
      );

      expect(player2Stats.odds).toBeGreaterThan(player1Stats.odds);
    });
  });

  describe('Database State Verification', () => {
    it('should correctly update database after bet placement', async () => {
      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 200
        });

      // Verify bet in database
      const bet = db.get(
        'SELECT * FROM bets WHERE user_id = ? AND game_id = ?',
        [testUserId, testGameId]
      );
      expect(bet).toBeDefined();
      expect(bet.amount).toBe(200);
      expect(bet.status).toBe('pending');

      // Verify balance in database
      const userStats = db.get(
        'SELECT virtual_currency FROM user_stats WHERE user_id = ?',
        [testUserId]
      );
      expect(userStats.virtual_currency).toBe(800);
    });

    it('should maintain data consistency across multiple operations', async () => {
      // Place multiple bets on different games
      const game2Id = testGameId + '-2';
      const game3Id = testGameId + '-3';

      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: testGameId,
          playerId: testPlayerId,
          amount: 100
        });

      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: game2Id,
          playerId: testPlayerId,
          amount: 200
        });

      await request(app)
        .post('/api/bets')
        .send({
          userId: testUserId,
          gameId: game3Id,
          playerId: testPlayerId,
          amount: 300
        });

      // Verify final balance
      const balanceResponse = await request(app)
        .get(`/api/bets/user/${testUserId}/balance`);
      expect(balanceResponse.body.balance).toBe(400); // 1000 - 100 - 200 - 300

      // Verify all bets recorded
      const historyResponse = await request(app)
        .get(`/api/bets/user/${testUserId}/history`);
      expect(historyResponse.body.totalBets).toBe(3);
      expect(historyResponse.body.totalWagered).toBe(600);
    });
  });

  describe('Error Handling - Invalid IDs', () => {
    it('should handle non-existent game ID gracefully', async () => {
      const response = await request(app)
        .get('/api/bets/game/non-existent-game-id/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalBets).toBe(0);
    });

    it('should handle non-existent user ID for history', async () => {
      const response = await request(app)
        .get('/api/bets/user/non-existent-user-id/history');

      expect(response.status).toBe(200);
      expect(response.body.totalBets).toBe(0);
      expect(response.body.bets).toHaveLength(0);
    });
  });
});
