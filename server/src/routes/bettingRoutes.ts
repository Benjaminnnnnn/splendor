import { Router } from 'express';
import { BettingController } from '../controllers/bettingController';

const router = Router();
const bettingController = new BettingController();

// Place a bet
router.post('/', bettingController.placeBet);

// Get betting stats for a game (must come before /:betId)
router.get('/game/:gameId/stats', bettingController.getGameStats);

// Get all bets for a game (must come before /:betId)
router.get('/game/:gameId', bettingController.getGameBets);

// Get user's betting history (must come before /:betId)
router.get('/user/:userId/history', bettingController.getUserHistory);

// Get user's balance (must come before /:betId)
router.get('/user/:userId/balance', bettingController.getUserBalance);

// Get a specific bet (must come last to avoid catching other routes)
router.get('/:betId', bettingController.getBet);

export default router;
