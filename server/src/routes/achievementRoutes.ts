import { Router } from 'express';
import { AchievementController } from '../controllers/achievementController';

export default function achievementRoutes(): Router {
  const router = Router();
  const achievementController = new AchievementController();

  router.get('/:userId/achievements', achievementController.getUserAchievements);
  router.post('/:userId/achievements/evaluate', achievementController.evaluateUserAchievements);

  return router;
}
