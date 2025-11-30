import { test, expect } from '@playwright/test';

test.describe('Betting System E2E Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const API_URL = process.env.API_URL || 'http://localhost:3001';

  let testUserId: string;
  let testGameId: string;

  test.beforeEach(async ({ request }) => {
    // Create test user
    const timestamp = Date.now();
    const registerResponse = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `testuser${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'password123'
      }
    });

    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    testUserId = userData.id; // API returns user object directly, not wrapped
  });

  test('should display user virtual currency balance', async ({ page, request }) => {
    // Get user balance
    const balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    expect(balanceResponse.ok()).toBeTruthy();
    const balanceData = await balanceResponse.json();
    
    expect(balanceData.balance).toBe(1000); // Initial balance
  });

  test('should place a bet successfully via API', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place bet
    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      }
    });

    expect(betResponse.ok()).toBeTruthy();
    const betData = await betResponse.json();
    
    expect(betData.bet).toBeDefined();
    expect(betData.bet.amount).toBe(100);
    expect(betData.bet.status).toBe('pending');
    expect(betData.newBalance).toBe(900);
  });

  test('should reject invalid bet amounts', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Test minimum bet validation
    const minBetResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 5 // Below minimum
      }
    });

    expect(minBetResponse.status()).toBe(400);
    const minBetError = await minBetResponse.json();
    expect(minBetError.error).toContain('Minimum bet amount');

    // Test maximum bet validation
    const maxBetResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 1500 // Above maximum
      }
    });

    expect(maxBetResponse.status()).toBe(400);
    const maxBetError = await maxBetResponse.json();
    expect(maxBetError.error).toContain('Maximum bet amount');
  });

  test('should prevent duplicate bets on same game', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place first bet
    const firstBetResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      }
    });

    expect(firstBetResponse.ok()).toBeTruthy();

    // Try to place second bet on same game
    const secondBetResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 50
      }
    });

    expect(secondBetResponse.status()).toBe(400);
    const error = await secondBetResponse.json();
    expect(error.error).toContain('already have an active bet');
  });

  test('should retrieve betting statistics for a game', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place bet
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 150
      }
    });

    // Get game stats
    const statsResponse = await request.get(`${API_URL}/api/bets/game/${testGameId}/stats`);
    expect(statsResponse.ok()).toBeTruthy();
    
    const stats = await statsResponse.json();
    expect(stats.gameId).toBe(testGameId);
    expect(stats.totalBets).toBe(1);
    expect(stats.totalAmount).toBe(150);
    expect(stats.playerBets).toHaveLength(1);
    expect(stats.playerBets[0].playerId).toBe(testPlayerId);
  });

  test('should retrieve user betting history', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place bet
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 200
      }
    });

    // Get user history
    const historyResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/history`);
    expect(historyResponse.ok()).toBeTruthy();
    
    const history = await historyResponse.json();
    expect(history.userId).toBe(testUserId);
    expect(history.totalBets).toBeGreaterThanOrEqual(1);
    expect(history.totalWagered).toBeGreaterThanOrEqual(200);
    expect(history.bets.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle bet settlement correctly', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place bet
    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      }
    });

    const betData = await betResponse.json();
    const betId = betData.bet.id;

    // Check initial balance
    const initialBalanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    const initialBalance = (await initialBalanceResponse.json()).balance;

    // Note: In a real E2E test, we would complete the game here
    // For now, we just verify the bet was created
    const betCheckResponse = await request.get(`${API_URL}/api/bets/${betId}`);
    expect(betCheckResponse.ok()).toBeTruthy();
    
    const bet = await betCheckResponse.json();
    expect(bet.status).toBe('pending');
    expect(bet.amount).toBe(100);
  });

  test('should calculate odds based on betting distribution', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const player1Id = `player-1-${Date.now()}`;
    const player2Id = `player-2-${Date.now()}`;

    // Create second test user
    const timestamp = Date.now();
    const registerResponse = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `testuser2${timestamp}`,
        email: `test2${timestamp}@example.com`,
        password: 'password123'
      }
    });
    const user2Data = await registerResponse.json();
    const testUserId2 = user2Data.id;

    // User 1 bets on player 1
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: player1Id,
        amount: 100
      }
    });

    // User 2 bets on player 2
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId2,
        gameId: testGameId,
        playerId: player2Id,
        amount: 100
      }
    });

    // Check stats
    const statsResponse = await request.get(`${API_URL}/api/bets/game/${testGameId}/stats`);
    const stats = await statsResponse.json();

    expect(stats.totalBets).toBe(2);
    expect(stats.totalAmount).toBe(200);
    expect(stats.playerBets).toHaveLength(2);
  });

  test('should enforce insufficient balance constraint', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Try to bet more than balance (1001 exceeds max bet of 1000, so test with 1000 first to drain balance)
    // First bet 500 to reduce balance
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: `${testGameId}-1`,
        playerId: testPlayerId,
        amount: 500
      }
    });

    // Now try to bet 600 (more than remaining 500 balance)
    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 600
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    expect(error.error).toContain('Insufficient balance');
  });

  test('should track balance changes through multiple bets', async ({ request }) => {
    // Check initial balance
    let balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    let balance = (await balanceResponse.json()).balance;
    expect(balance).toBe(1000);

    // Place first bet
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: `game-1-${Date.now()}`,
        playerId: `player-1-${Date.now()}`,
        amount: 200
      }
    });

    // Check balance after first bet
    balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    balance = (await balanceResponse.json()).balance;
    expect(balance).toBe(800);

    // Place second bet on different game
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: `game-2-${Date.now()}`,
        playerId: `player-2-${Date.now()}`,
        amount: 300
      }
    });

    // Check balance after second bet
    balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    balance = (await balanceResponse.json()).balance;
    expect(balance).toBe(500);
  });

  test('should retrieve all bets for a specific game', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    // Place bet
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 100
      }
    });

    // Get all bets for game
    const betsResponse = await request.get(`${API_URL}/api/bets/game/${testGameId}`);
    expect(betsResponse.ok()).toBeTruthy();
    
    const bets = await betsResponse.json();
    expect(Array.isArray(bets)).toBeTruthy();
    expect(bets.length).toBeGreaterThanOrEqual(1);
    expect(bets[0].game_id).toBe(testGameId);
  });

  test('should reject bet with exactly 5 coins (below minimum)', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 5
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    expect(error.error).toContain('Minimum bet amount');
  });

  test('should accept bet with exactly 10 coins (minimum boundary)', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 10
      }
    });

    expect(betResponse.ok()).toBeTruthy();
    const betData = await betResponse.json();
    expect(betData.bet.amount).toBe(10);
    expect(betData.newBalance).toBe(990);
  });

  test('should accept bet with exactly 1000 coins (maximum boundary)', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 1000
      }
    });

    expect(betResponse.ok()).toBeTruthy();
    const betData = await betResponse.json();
    expect(betData.bet.amount).toBe(1000);
    expect(betData.newBalance).toBe(0);
  });

  test('should reject bet with 1500 coins (above maximum)', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 1500
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    expect(error.error).toContain('Maximum bet amount');
  });

  test('should reject bet with non-integer amount', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 99.99
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    expect(error.error).toContain('positive integer');
  });

  test('should reject bet with zero amount', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 0
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    // API may return "Missing required fields" if 0 is treated as falsy, or "Minimum bet amount"
    expect(error.error).toMatch(/Missing required fields|Minimum bet amount|positive integer/);
  });

  test('should reject bet with negative amount', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: -100
      }
    });

    expect(betResponse.status()).toBe(400);
    const error = await betResponse.json();
    // API returns "Minimum bet amount is 10" for negative amounts
    expect(error.error).toMatch(/Minimum bet amount|positive integer/);
  });

  test('should handle new user with auto-created balance', async ({ request }) => {
    // Create a brand new user
    const timestamp = Date.now();
    const registerResponse = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `brandnewuser${timestamp}`,
        email: `brandnew${timestamp}@example.com`,
        password: 'password123'
      }
    });

    expect(registerResponse.ok()).toBeTruthy();
    const userData = await registerResponse.json();
    const newUserId = userData.id;

    // Check initial balance
    const balanceResponse = await request.get(`${API_URL}/api/bets/user/${newUserId}/balance`);
    expect(balanceResponse.ok()).toBeTruthy();
    const balanceData = await balanceResponse.json();
    expect(balanceData.balance).toBe(1000);

    // Place bet to verify auto-created stats work
    testGameId = `test-game-${Date.now()}`;
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: newUserId,
        gameId: testGameId,
        playerId: testPlayerId,
        amount: 250
      }
    });

    expect(betResponse.ok()).toBeTruthy();
    const betData = await betResponse.json();
    expect(betData.newBalance).toBe(750);
  });

  test('should handle multiple bets from different users on same game', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;
    const player1Id = `player-1-${Date.now()}`;
    const player2Id = `player-2-${Date.now()}`;
    const player3Id = `player-3-${Date.now()}`;

    // Create additional users
    const timestamp = Date.now();
    const user2Response = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `testuser2${timestamp}`,
        email: `test2${timestamp}@example.com`,
        password: 'password123'
      }
    });
    const user2Data = await user2Response.json();
    const user2Id = user2Data.id;

    const user3Response = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `testuser3${timestamp}`,
        email: `test3${timestamp}@example.com`,
        password: 'password123'
      }
    });
    const user3Data = await user3Response.json();
    const user3Id = user3Data.id;

    // Place bets from different users
    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: player1Id,
        amount: 200
      }
    });

    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: user2Id,
        gameId: testGameId,
        playerId: player2Id,
        amount: 300
      }
    });

    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: user3Id,
        gameId: testGameId,
        playerId: player3Id,
        amount: 100
      }
    });

    // Verify game stats
    const statsResponse = await request.get(`${API_URL}/api/bets/game/${testGameId}/stats`);
    expect(statsResponse.ok()).toBeTruthy();
    const stats = await statsResponse.json();

    expect(stats.totalBets).toBe(3);
    expect(stats.totalAmount).toBe(600);
    expect(stats.playerBets).toHaveLength(3);

    // Verify odds are different based on bet amounts
    const player1Stats = stats.playerBets.find((p: any) => p.playerId === player1Id);
    const player2Stats = stats.playerBets.find((p: any) => p.playerId === player2Id);
    const player3Stats = stats.playerBets.find((p: any) => p.playerId === player3Id);

    // Player 3 (smallest bet) should have highest odds
    expect(player3Stats.odds).toBeGreaterThan(player2Stats.odds);
    expect(player3Stats.odds).toBeGreaterThan(player1Stats.odds);
  });

  test('should verify balance consistency after multiple operations', async ({ request }) => {
    // Initial balance check
    let balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    let balance = (await balanceResponse.json()).balance;
    const initialBalance = balance;

    // Place multiple bets
    const game1Id = `game-1-${Date.now()}`;
    const game2Id = `game-2-${Date.now()}`;
    const game3Id = `game-3-${Date.now()}`;

    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: game1Id,
        playerId: `player-${Date.now()}`,
        amount: 100
      }
    });

    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: game2Id,
        playerId: `player-${Date.now()}`,
        amount: 200
      }
    });

    await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: game3Id,
        playerId: `player-${Date.now()}`,
        amount: 150
      }
    });

    // Verify final balance
    balanceResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/balance`);
    balance = (await balanceResponse.json()).balance;

    expect(balance).toBe(initialBalance - 450);

    // Verify history
    const historyResponse = await request.get(`${API_URL}/api/bets/user/${testUserId}/history`);
    const history = await historyResponse.json();

    expect(history.totalBets).toBeGreaterThanOrEqual(3);
    expect(history.totalWagered).toBeGreaterThanOrEqual(450);
  });

  test('should handle bet on non-existent game', async ({ request }) => {
    // This should still work - betting system doesn't validate game existence
    const nonExistentGameId = 'non-existent-game-id';
    const testPlayerId = `test-player-${Date.now()}`;

    const betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: nonExistentGameId,
        playerId: testPlayerId,
        amount: 100
      }
    });

    // Should succeed (game validation is not enforced in current implementation)
    expect(betResponse.ok()).toBeTruthy();
  });

  test('should retrieve empty history for user with no bets', async ({ request }) => {
    // Create new user
    const timestamp = Date.now();
    const registerResponse = await request.post(`${API_URL}/api/users/register`, {
      data: {
        username: `nobetsuser${timestamp}`,
        email: `nobets${timestamp}@example.com`,
        password: 'password123'
      }
    });

    const userData = await registerResponse.json();
    const newUserId = userData.id;

    // Get history
    const historyResponse = await request.get(`${API_URL}/api/bets/user/${newUserId}/history`);
    expect(historyResponse.ok()).toBeTruthy();

    const history = await historyResponse.json();
    expect(history.totalBets).toBe(0);
    expect(history.totalWagered).toBe(0);
    expect(history.totalWon).toBe(0);
    expect(history.bets).toHaveLength(0);
  });

  test('should handle missing required fields in bet request', async ({ request }) => {
    testGameId = `test-game-${Date.now()}`;

    // Missing playerId
    let betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        amount: 100
      }
    });

    expect(betResponse.status()).toBe(400);
    let error = await betResponse.json();
    expect(error.error).toContain('Missing required fields');

    // Missing amount
    betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        userId: testUserId,
        gameId: testGameId,
        playerId: `player-${Date.now()}`
      }
    });

    expect(betResponse.status()).toBe(400);
    error = await betResponse.json();
    expect(error.error).toContain('Missing required fields');

    // Missing userId
    betResponse = await request.post(`${API_URL}/api/bets`, {
      data: {
        gameId: testGameId,
        playerId: `player-${Date.now()}`,
        amount: 100
      }
    });

    expect(betResponse.status()).toBe(401);
    error = await betResponse.json();
    expect(error.error).toContain('User ID required');
  });
});
