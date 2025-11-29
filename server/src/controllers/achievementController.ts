import { Request, Response } from 'express';
import { AchievementService } from '../services/achievementService';

export class AchievementController {
  private achievementService: AchievementService;

  constructor() {
    this.achievementService = new AchievementService();
  }

  getUserAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId parameter' });
        return;
      }

      const result = await this.achievementService.getUserAchievements(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting user achievements:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  evaluateUserAchievements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId parameter' });
        return;
      }

      const result = await this.achievementService.evaluateUserAchievements(userId);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error evaluating user achievements:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
