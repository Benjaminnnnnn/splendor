import { Request, Response } from "express";
import { GameService } from "../services/gameService";

// Enhanced logging utility
const log = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] CONTROLLER: ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(
      `[${timestamp}] CONTROLLER ERROR: ${message}`,
      error ? error.stack || error : ""
    );
  },
};

export class GameController {
  private gameService: GameService;

  constructor(gameService: GameService) {
    this.gameService = gameService;
  }

  createGame = async (req: Request, res: Response) => {
    try {
      const { playerName, lobbyName, isPrivate, userId } = req.body;

      log.info("Creating new game", {
        playerName,
        lobbyName,
        isPrivate,
        userId,
      });

      const result = await this.gameService.createGame({
        playerName,
        lobbyName,
        isPrivate,
        userId,
      });

      log.info("Game created successfully", {
        gameId: result.game.id,
        lobbyName: result.game.name,
        playerId: result.playerId,
        isPrivate: result.game.isPrivate,
        inviteCode: result.game.inviteCode,
      });

      res.status(201).json(result);
    } catch (error) {
      log.error("Failed to create game", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      log.info("Getting game", { gameId });
      const game = await this.gameService.getGame(gameId);
      log.info("Game retrieved successfully", {
        gameId,
        playerCount: game.players.length,
      });
      res.json(game);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  joinGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerName, userId } = req.body;

      log.info("Player joining game", { gameId, playerName, userId });

      const result = await this.gameService.joinGame(gameId, {
        playerName,
        userId,
      });

      log.info("Player joined successfully", {
        gameId,
        playerId: result.playerId,
      });

      res.json(result);
    } catch (error) {
      log.error("Failed to join game", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  leaveGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.body;
      const game = await this.gameService.leaveGame(gameId, playerId);
      res.json(game);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  kickPlayer = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { hostPlayerId, playerIdToKick } = req.body;

      log.info("Host kicking player", { gameId, hostPlayerId, playerIdToKick });

      const game = await this.gameService.kickPlayer(
        gameId,
        hostPlayerId,
        playerIdToKick
      );

      log.info("Player kicked successfully", { gameId, playerIdToKick });

      res.json(game);
    } catch (error) {
      log.error("Failed to kick player", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  joinGameByInviteCode = async (req: Request, res: Response) => {
    try {
      const { inviteCode, playerName, userId } = req.body;

      log.info("Joining game by invite code", {
        inviteCode,
        playerName,
        userId,
      });

      const result = await this.gameService.joinGameByInviteCode(inviteCode, {
        playerName,
        userId,
      });

      log.info("Game joined successfully by invite code", {
        gameId: result.game.id,
        playerId: result.playerId,
        inviteCode,
      });

      res.json(result);
    } catch (error) {
      log.error("Failed to join game by invite code", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  listGames = async (req: Request, res: Response) => {
    try {
      const games = await this.gameService.listGames();
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  };

  takeTokens = async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { playerId, tokens } = req.body;

    try {
      log.info("Take tokens action", { gameId, playerId, tokens });
      const game = await this.gameService.takeTokens(gameId, playerId, tokens);
      log.info("Tokens taken successfully", {
        gameId,
        playerId,
        tokens,
        currentPlayer: game.currentPlayerIndex,
        playerTokens: game.players.find((p) => p.id === playerId)?.tokens,
        boardTokens: game.board.tokens,
      });
      res.json(game);
    } catch (error) {
      log.error("Failed to take tokens", { gameId, playerId, tokens, error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  purchaseCard = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId, cardId, payment } = req.body;
      const game = await this.gameService.purchaseCard(
        gameId,
        playerId,
        cardId,
        payment
      );
      res.json(game);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  reserveCard = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId, cardId } = req.body;
      const game = await this.gameService.reserveCard(gameId, playerId, cardId);
      res.json(game);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  purchaseReservedCard = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId, cardId, payment } = req.body;
      const game = await this.gameService.purchaseReservedCard(
        gameId,
        playerId,
        cardId,
        payment
      );
      res.json(game);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  startGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;

      log.info("Starting game", { gameId });

      const game = await this.gameService.startGame(gameId);

      log.info("Game started successfully", {
        gameId,
        playerCount: game.players.length,
        state: game.state,
      });

      res.json(game);
    } catch (error) {
      log.error("Failed to start game", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  endGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { playerId } = req.body;

      console.log(`[${new Date().toISOString()}] CONTROLLER: Ending game`, {
        gameId,
        playerId,
      });

      const game = await this.gameService.endGame(gameId, playerId);

      console.log(
        `[${new Date().toISOString()}] CONTROLLER: Game ended successfully`,
        {
          gameId,
          endedBy: playerId,
        }
      );

      res.json(game);
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] CONTROLLER: Error ending game`,
        {
          gameId: req.params.gameId,
          error: (error as Error).message,
        }
      );
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Set game state for testing purposes
   * WARNING: This endpoint should only be available in development/test environments
   */
  setGameState = async (req: Request, res: Response) => {
    try {
      // Only allow in development/test mode
      if (process.env.NODE_ENV === "production") {
        return res
          .status(403)
          .json({ error: "This endpoint is not available in production" });
      }

      const { gameId } = req.params;
      const customState = req.body;

      log.info("Setting custom game state", { gameId, customState });

      const game = await this.gameService.setGameState(gameId, customState);

      log.info("Game state set successfully", { gameId });

      res.json(game);
    } catch (error) {
      log.error("Failed to set game state", error);
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
