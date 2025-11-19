import { Request, Response } from 'express';
import { UserService } from '../services/userService';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await this.userService.registerUser(username, email, password);
      res.status(201).json(user);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await this.userService.loginUser(email, password);
      res.status(200).json(user);
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(401).json({ error: (error as Error).message });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await this.userService.getUserById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const stats = await this.userService.getUserStats(userId);

      if (!stats) {
        res.status(404).json({ error: 'User stats not found' });
        return;
      }

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  updateUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const update = req.body;

      const stats = await this.userService.updateUserStats(userId, update);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error updating user stats:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await this.userService.getLeaderboard(limit);
      res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  getUserLeaderboardRank = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const rank = await this.userService.getUserLeaderboardRank(userId);
      
      if (rank === null) {
        res.status(404).json({ error: 'User not found on leaderboard' });
        return;
      }
      
      res.status(200).json({ rank });
    } catch (error) {
      console.error('Error getting user leaderboard rank:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!query) {
        res.status(400).json({ error: 'Search query required' });
        return;
      }

      const users = await this.userService.searchUsers(query, limit);
      res.status(200).json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
