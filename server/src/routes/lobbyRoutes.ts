import { Router } from 'express';
import { LobbyController } from '../controllers/lobbyController';

export default function lobbyRoutes(): Router {
  const router = Router();
  const lobbyController = new LobbyController();

  // Lobby management
  router.post('/', lobbyController.createLobby);
  router.get('/', lobbyController.listPublicLobbies);
  router.get('/:lobbyId', lobbyController.getLobbyById);

  // Lobby actions
  router.post('/:lobbyId/join', lobbyController.joinLobby);
  router.post('/:lobbyId/leave', lobbyController.leaveLobby);
  router.post('/:lobbyId/ready', lobbyController.setReadyStatus);
  router.post('/:lobbyId/start', lobbyController.startGame);

  // User lobbies
  router.get('/user/:userId', lobbyController.getUserLobbies);

  return router;
}
