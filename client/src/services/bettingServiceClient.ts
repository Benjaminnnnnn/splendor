import { Bet, BetResponse, GameBettingStats, UserBettingHistory, PlaceBetRequest } from '../../../shared/types/betting';

const API_BASE_URL = 'http://localhost:3001/api/bets';

export class BettingServiceClient {
  /**
   * Place a bet on a player to win a game
   */
  async placeBet(userId: string, request: PlaceBetRequest): Promise<BetResponse> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...request
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to place bet');
    }

    return response.json();
  }

  /**
   * Get user's virtual currency balance
   */
  async getUserBalance(userId: string): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/balance`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch balance');
    }

    const data = await response.json();
    return data.balance;
  }

  /**
   * Get user's betting history
   */
  async getUserBettingHistory(userId: string, limit: number = 20): Promise<UserBettingHistory> {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/history?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch betting history');
    }

    return response.json();
  }

  /**
   * Get betting statistics for a game
   */
  async getGameBettingStats(gameId: string): Promise<GameBettingStats> {
    const response = await fetch(`${API_BASE_URL}/game/${gameId}/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game betting stats');
    }

    return response.json();
  }

  /**
   * Get all bets for a game
   */
  async getGameBets(gameId: string): Promise<Bet[]> {
    const response = await fetch(`${API_BASE_URL}/game/${gameId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game bets');
    }

    return response.json();
  }

  /**
   * Get a specific bet by ID
   */
  async getBetById(betId: string): Promise<Bet> {
    const response = await fetch(`${API_BASE_URL}/${betId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch bet');
    }

    return response.json();
  }
}

export const bettingServiceClient = new BettingServiceClient();
