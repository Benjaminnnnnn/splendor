import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../infrastructure/database';
import { Bet, BetStatus, PlaceBetRequest, BetResponse, GameBettingStats, UserBettingHistory } from '../../../shared/types/betting';

export class BettingService {
  private db: DatabaseConnection;
  private readonly MIN_BET_AMOUNT = 10;
  private readonly MAX_BET_AMOUNT = 1000;
  private readonly INITIAL_VIRTUAL_CURRENCY = 1000;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Place a bet on a player to win a game
   */
  async placeBet(userId: string, request: PlaceBetRequest): Promise<BetResponse> {
    // Validate bet amount
    if (request.amount < this.MIN_BET_AMOUNT) {
      throw new Error(`Minimum bet amount is ${this.MIN_BET_AMOUNT}`);
    }
    if (request.amount > this.MAX_BET_AMOUNT) {
      throw new Error(`Maximum bet amount is ${this.MAX_BET_AMOUNT}`);
    }
    if (request.amount <= 0 || !Number.isInteger(request.amount)) {
      throw new Error('Bet amount must be a positive integer');
    }

    // Get user's current balance, create user_stats if doesn't exist
    let userStats = this.db.get(
      'SELECT virtual_currency FROM user_stats WHERE user_id = ?',
      [userId]
    );

    if (!userStats) {
      // Create user_stats record with initial balance
      const now = Date.now();
      this.db.run(
        `INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [userId, this.INITIAL_VIRTUAL_CURRENCY, now, now]
      );
      userStats = { virtual_currency: this.INITIAL_VIRTUAL_CURRENCY };
    }

    const currentBalance = userStats.virtual_currency;

    // Check if user has enough balance
    if (currentBalance < request.amount) {
      throw new Error(`Insufficient balance. Current balance: ${currentBalance}`);
    }

    // Check if game is still accepting bets (game must be in progress)
    // This would require checking game state from GameService
    // For now, we'll assume the game is valid

    // Check if user already has a bet on this specific player in this game
    const existingBet = this.db.get(
      'SELECT id FROM bets WHERE game_id = ? AND user_id = ? AND player_id = ? AND status = ?',
      [request.gameId, userId, request.playerId, BetStatus.PENDING]
    );

    if (existingBet) {
      throw new Error('You already have an active bet on this player');
    }

    // Calculate odds based on current betting distribution
    const odds = await this.calculateOdds(request.gameId, request.playerId);

    const betId = uuidv4();
    const now = Date.now();

    // Create bet and update balance in a transaction
    this.db.transaction(() => {
      // Create bet
      this.db.run(
        `INSERT INTO bets (id, game_id, user_id, player_id, amount, odds, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [betId, request.gameId, userId, request.playerId, request.amount, odds, BetStatus.PENDING, now]
      );

      // Deduct amount from user's balance
      this.db.run(
        'UPDATE user_stats SET virtual_currency = virtual_currency - ?, updated_at = ? WHERE user_id = ?',
        [request.amount, now, userId]
      );
    });

    // Get the created bet
    const bet = await this.getBetById(betId);
    const newBalance = currentBalance - request.amount;

    console.log(`[BettingService] User ${userId} placed bet of ${request.amount} on player ${request.playerId} in game ${request.gameId}`);

    return {
      bet: bet!,
      newBalance
    };
  }

  /**
   * Calculate odds for a player based on current betting distribution
   */
  private async calculateOdds(gameId: string, playerId: string): Promise<number> {
    // Get all bets for this game
    const bets = this.db.query(
      'SELECT player_id, SUM(amount) as total FROM bets WHERE game_id = ? AND status = ? GROUP BY player_id',
      [gameId, BetStatus.PENDING]
    );

    if (bets.length === 0) {
      return 2.0; // Default odds if no bets yet
    }

    const totalAmount = bets.reduce((sum: number, bet: any) => sum + bet.total, 0);
    const playerBet = bets.find((bet: any) => bet.player_id === playerId);
    const playerAmount = playerBet ? playerBet.total : 0;

    // If no one has bet on this player yet, return higher odds
    if (playerAmount === 0) {
      return 3.0;
    }

    // Calculate odds: higher odds for less popular players
    // Formula: (total pool / player pool) with smoothing factor
    // Minimum 1.5x, maximum 10x
    const rawOdds = (totalAmount / playerAmount);
    return Math.max(1.5, Math.min(10.0, rawOdds));
  }

  /**
   * Settle all bets for a completed game
   */
  async settleBets(gameId: string, winnerPlayerId: string): Promise<void> {
    const now = Date.now();

    // Get all pending bets for this game
    const bets = this.db.query(
      'SELECT * FROM bets WHERE game_id = ? AND status = ?',
      [gameId, BetStatus.PENDING]
    );

    if (bets.length === 0) {
      console.log(`[BettingService] No bets to settle for game ${gameId}`);
      return;
    }

    console.log(`[BettingService] Settling ${bets.length} bets for game ${gameId}, winner: ${winnerPlayerId}`);

    // Process each bet
    for (const betRow of bets) {
      const isWinner = betRow.player_id === winnerPlayerId;
      const status = isWinner ? BetStatus.WON : BetStatus.LOST;
      const payout = isWinner ? Math.round(betRow.amount * betRow.odds) : 0;

      this.db.transaction(() => {
        // Update bet status
        this.db.run(
          'UPDATE bets SET status = ?, payout = ?, settled_at = ? WHERE id = ?',
          [status, payout, now, betRow.id]
        );

        // If winner, add payout to user's balance
        if (isWinner && payout > 0) {
          this.db.run(
            'UPDATE user_stats SET virtual_currency = virtual_currency + ?, updated_at = ? WHERE user_id = ?',
            [payout, now, betRow.user_id]
          );
          console.log(`[BettingService] User ${betRow.user_id} won ${payout} (bet: ${betRow.amount}, odds: ${betRow.odds})`);
        }
      });
    }

    console.log(`[BettingService] Settled all bets for game ${gameId}`);
  }

  /**
   * Cancel all bets for a game (e.g., if game is terminated)
   */
  async cancelBets(gameId: string): Promise<void> {
    const now = Date.now();

    // Get all pending bets for this game
    const bets = this.db.query(
      'SELECT * FROM bets WHERE game_id = ? AND status = ?',
      [gameId, BetStatus.PENDING]
    );

    if (bets.length === 0) {
      return;
    }

    console.log(`[BettingService] Cancelling ${bets.length} bets for game ${gameId}`);

    // Refund all bets
    for (const betRow of bets) {
      this.db.transaction(() => {
        // Update bet status
        this.db.run(
          'UPDATE bets SET status = ?, settled_at = ? WHERE id = ?',
          [BetStatus.CANCELLED, now, betRow.id]
        );

        // Refund amount to user's balance
        this.db.run(
          'UPDATE user_stats SET virtual_currency = virtual_currency + ?, updated_at = ? WHERE user_id = ?',
          [betRow.amount, now, betRow.user_id]
        );
      });
    }

    console.log(`[BettingService] Cancelled and refunded all bets for game ${gameId}`);
  }

  /**
   * Get betting statistics for a game
   */
  async getGameBettingStats(gameId: string): Promise<GameBettingStats> {
    const bets = this.db.query(
      `SELECT player_id, COUNT(*) as bet_count, SUM(amount) as total_amount
       FROM bets 
       WHERE game_id = ? AND status = ?
       GROUP BY player_id`,
      [gameId, BetStatus.PENDING]
    );

    const totalBets = bets.reduce((sum: number, bet: any) => sum + bet.bet_count, 0);
    const totalAmount = bets.reduce((sum: number, bet: any) => sum + bet.total_amount, 0);

    const playerBets = bets.map((bet: any) => {
      // Calculate odds using the same logic as calculateOdds
      let odds: number;
      if (totalAmount === 0 || bet.total_amount === 0) {
        odds = 2.0;
      } else {
        const rawOdds = totalAmount / bet.total_amount;
        odds = Math.max(1.5, Math.min(10.0, rawOdds));
      }

      return {
        playerId: bet.player_id,
        playerName: '', // Would need to fetch from game state
        totalBets: bet.bet_count,
        totalAmount: bet.total_amount,
        odds
      };
    });

    return {
      gameId,
      totalBets,
      totalAmount,
      playerBets
    };
  }

  /**
   * Get user's betting history
   */
  async getUserBettingHistory(userId: string, limit: number = 20): Promise<UserBettingHistory> {
    const bets = this.db.query(
      'SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );

    const totalBets = bets.length;
    const totalWagered = bets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
    const totalWon = bets
      .filter((bet: any) => bet.status === BetStatus.WON)
      .reduce((sum: number, bet: any) => sum + (bet.payout || 0), 0);
    const wonBets = bets.filter((bet: any) => bet.status === BetStatus.WON).length;
    const settledBets = bets.filter((bet: any) => bet.status !== BetStatus.PENDING).length;
    const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;

    return {
      userId,
      totalBets,
      totalWagered,
      totalWon,
      winRate,
      bets: bets.map(this.mapBetFromDb)
    };
  }

  /**
   * Get a specific bet by ID
   */
  async getBetById(betId: string): Promise<Bet | null> {
    const betRow = this.db.get('SELECT * FROM bets WHERE id = ?', [betId]);
    if (!betRow) {
      return null;
    }
    return this.mapBetFromDb(betRow);
  }

  /**
   * Get all bets for a game
   */
  async getBetsByGame(gameId: string): Promise<Bet[]> {
    const bets = this.db.query(
      'SELECT * FROM bets WHERE game_id = ? ORDER BY created_at DESC',
      [gameId]
    );
    return bets.map(this.mapBetFromDb);
  }

  /**
   * Get user's virtual currency balance
   */
  async getUserBalance(userId: string): Promise<number> {
    let userStats = this.db.get(
      'SELECT virtual_currency FROM user_stats WHERE user_id = ?',
      [userId]
    );
    
    if (!userStats) {
      // Create user_stats record with initial balance
      const now = Date.now();
      this.db.run(
        `INSERT INTO user_stats (user_id, virtual_currency, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [userId, this.INITIAL_VIRTUAL_CURRENCY, now, now]
      );
      return this.INITIAL_VIRTUAL_CURRENCY;
    }
    
    return userStats.virtual_currency;
  }

  /**
   * Add virtual currency to user's balance (admin function)
   */
  async addVirtualCurrency(userId: string, amount: number): Promise<number> {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const now = Date.now();
    this.db.run(
      'UPDATE user_stats SET virtual_currency = virtual_currency + ?, updated_at = ? WHERE user_id = ?',
      [amount, now, userId]
    );

    return await this.getUserBalance(userId);
  }

  /**
   * Map database row to Bet object
   */
  private mapBetFromDb(row: any): Bet {
    return {
      id: row.id,
      game_id: row.game_id,
      user_id: row.user_id,
      player_id: row.player_id,
      amount: row.amount,
      odds: row.odds,
      status: row.status as BetStatus,
      payout: row.payout,
      created_at: new Date(row.created_at),
      settled_at: row.settled_at ? new Date(row.settled_at) : undefined
    };
  }
}
