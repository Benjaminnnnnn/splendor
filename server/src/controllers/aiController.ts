import { Request, Response } from 'express';
import { AIService } from '../services/aiService';

export class AIController {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  getRecommendation = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.query;

      if (!playerId || typeof playerId !== 'string') {
        return res.status(400).json({ error: 'Player ID is required' });
      }

      const recommendation = await this.aiService.getGameRecommendation(gameId, playerId);
      
      res.json({ recommendation });
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
