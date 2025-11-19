import { Request, Response } from 'express';
import { LobbyService } from '../services/lobbyService';

export class LobbyController {
  private lobbyService: LobbyService;

  constructor() {
    this.lobbyService = new LobbyService();
  }

  createLobby = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, hostId, maxPlayers, minPlayers, isPublic } = req.body;

      if (!name || !hostId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const lobby = await this.lobbyService.createLobby({
        name,
        hostId,
        maxPlayers,
        minPlayers,
        isPublic,
      });

      res.status(201).json(lobby);
    } catch (error) {
      console.error('Error creating lobby:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getLobbyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lobbyId } = req.params;
      const lobby = await this.lobbyService.getLobbyById(lobbyId);
      res.status(200).json(lobby);
    } catch (error) {
      console.error('Error getting lobby:', error);
      res.status(404).json({ error: (error as Error).message });
    }
  };

  listPublicLobbies = async (req: Request, res: Response): Promise<void> => {
    try {
      const lobbies = await this.lobbyService.listPublicLobbies();
      res.status(200).json(lobbies);
    } catch (error) {
      console.error('Error listing lobbies:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  joinLobby = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lobbyId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      const lobby = await this.lobbyService.joinLobby(lobbyId, { userId });
      res.status(200).json(lobby);
    } catch (error) {
      console.error('Error joining lobby:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  leaveLobby = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lobbyId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      await this.lobbyService.leaveLobby(lobbyId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error leaving lobby:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  setReadyStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lobbyId } = req.params;
      const { userId, isReady } = req.body;

      if (!userId || typeof isReady !== 'boolean') {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const lobby = await this.lobbyService.setReadyStatus(lobbyId, userId, isReady);
      res.status(200).json(lobby);
    } catch (error) {
      console.error('Error setting ready status:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  startGame = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lobbyId } = req.params;
      const gameId = await this.lobbyService.startGame(lobbyId);
      res.status(200).json({ gameId });
    } catch (error) {
      console.error('Error starting game:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getUserLobbies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const lobbies = await this.lobbyService.getUserLobbies(userId);
      res.status(200).json(lobbies);
    } catch (error) {
      console.error('Error getting user lobbies:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };
}
