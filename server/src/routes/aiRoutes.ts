import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { AIService } from '../services/aiService';
import { GameService } from '../services/gameService';

export default function aiRoutes(gameService: GameService): Router {
  const router = Router();
  const aiService = new AIService(gameService);
  const aiController = new AIController(aiService);

  // Get AI recommendation for a game
  router.get('/:gameId/recommendation', aiController.getRecommendation);

  return router;
}
