import { Request, Response } from 'express';
import { BettingService } from '../services/bettingService';
import { PlaceBetRequest } from '../../../shared/types/betting';

export class BettingController {
  private bettingService: BettingService;

  constructor() {
    this.bettingService = new BettingService();
  }

  /**
   * Place a bet on a player to win
   * POST /api/bets
   */
  placeBet = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.body.userId;
      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const { gameId, playerId, amount } = req.body;

      if (!gameId || !playerId || !amount) {
        res.status(400).json({ error: 'Missing required fields: gameId, playerId, amount' });
        return;
      }

      const request: PlaceBetRequest = {
        gameId,
        playerId,
        amount: Number(amount)
      };

      const result = await this.bettingService.placeBet(userId, request);
      res.status(201).json(result);
    } catch (error) {
      console.error('[BettingController] Error placing bet:', error);
      const message = error instanceof Error ? error.message : 'Failed to place bet';
      res.status(400).json({ error: message });
    }
  };

  /**
   * Get betting statistics for a game
   * GET /api/bets/game/:gameId/stats
   */
  getGameStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;
      const stats = await this.bettingService.getGameBettingStats(gameId);
      res.json(stats);
    } catch (error) {
      console.error('[BettingController] Error getting game stats:', error);
      res.status(500).json({ error: 'Failed to get game betting stats' });
    }
  };

  /**
   * Get all bets for a game
   * GET /api/bets/game/:gameId
   */
  getGameBets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { gameId } = req.params;
      const bets = await this.bettingService.getBetsByGame(gameId);
      res.json(bets);
    } catch (error) {
      console.error('[BettingController] Error getting game bets:', error);
      res.status(500).json({ error: 'Failed to get game bets' });
    }
  };

  /**
   * Get user's betting history
   * GET /api/bets/user/:userId/history
   */
  getUserHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const history = await this.bettingService.getUserBettingHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('[BettingController] Error getting user history:', error);
      res.status(500).json({ error: 'Failed to get betting history' });
    }
  };

  /**
   * Get user's virtual currency balance
   * GET /api/bets/user/:userId/balance
   */
  getUserBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const balance = await this.bettingService.getUserBalance(userId);
      res.json({ balance });
    } catch (error) {
      console.error('[BettingController] Error getting user balance:', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  };

  /**
   * Get a specific bet by ID
   * GET /api/bets/:betId
   */
  getBet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { betId } = req.params;
      const bet = await this.bettingService.getBetById(betId);
      
      if (!bet) {
        res.status(404).json({ error: 'Bet not found' });
        return;
      }

      res.json(bet);
    } catch (error) {
      console.error('[BettingController] Error getting bet:', error);
      res.status(500).json({ error: 'Failed to get bet' });
    }
  };
}
