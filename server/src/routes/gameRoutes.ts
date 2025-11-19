import { Router } from 'express';
import { GameController } from '../controllers/gameController';
import { GameService } from '../services/gameService';

export default function gameRoutes(gameService: GameService): Router {
  const router = Router();
  const gameController = new GameController(gameService);

  router.post('/', gameController.createGame);
  router.get('/:gameId', gameController.getGame);
  router.post('/:gameId/join', gameController.joinGame);
  router.post('/join-by-invite', gameController.joinGameByInviteCode);
  router.post('/:gameId/leave', gameController.leaveGame);
  router.post('/:gameId/kick', gameController.kickPlayer);
  router.get('/', gameController.listGames);

  router.post('/:gameId/actions/take-tokens', gameController.takeTokens);
  router.post('/:gameId/actions/purchase-card', gameController.purchaseCard);
  router.post('/:gameId/actions/reserve-card', gameController.reserveCard);
  router.post('/:gameId/actions/purchase-reserved-card', gameController.purchaseReservedCard);

  router.post('/:gameId/start', gameController.startGame);
  router.post('/:gameId/end', gameController.endGame);

  // Testing endpoint - only available in dev/test mode
  router.put('/:gameId/state', gameController.setGameState);

  return router;
}
