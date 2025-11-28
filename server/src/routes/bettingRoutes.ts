import { Router } from 'express';
import { BettingController } from '../controllers/bettingController';

const router = Router();
const bettingController = new BettingController();

// Place a bet
router.post('/', bettingController.placeBet);

// Get a specific bet
router.get('/:betId', bettingController.getBet);

// Get betting stats for a game
router.get('/game/:gameId/stats', bettingController.getGameStats);

// Get all bets for a game
router.get('/game/:gameId', bettingController.getGameBets);

// Get user's betting history
router.get('/user/:userId/history', bettingController.getUserHistory);

// Get user's balance
router.get('/user/:userId/balance', bettingController.getUserBalance);

export default router;
