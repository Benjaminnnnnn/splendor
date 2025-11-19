import { Router } from 'express';
import { UserController } from '../controllers/userController';

export default function userRoutes(): Router {
  const router = Router();
  const userController = new UserController();

  // Authentication
  router.post('/register', userController.registerUser);
  router.post('/login', userController.loginUser);

  // User management
  router.get('/search', userController.searchUsers);
  router.get('/leaderboard', userController.getLeaderboard);
  router.get('/:userId', userController.getUserById);
  router.get('/:userId/leaderboard-rank', userController.getUserLeaderboardRank);

  // User stats
  router.get('/:userId/stats', userController.getUserStats);
  router.put('/:userId/stats', userController.updateUserStats);

  return router;
}
