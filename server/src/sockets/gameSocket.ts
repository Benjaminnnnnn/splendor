import fs from 'fs';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { GameService } from '../services/gameService';
import { ChatSocketHandler } from './chatSocket';

// Create a simple file logger for socket events
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const socketLogStream = fs.createWriteStream(path.join(logsDir, 'game-activity.log'), { flags: 'a' });

function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  socketLogStream.write(`[${timestamp}] ${message}\n`);
}

export class GameSocketHandler {
  private io: Server;
  private gameService: GameService;
  private chatSocketHandler?: ChatSocketHandler;

  constructor(io: Server, gameService: GameService) {
    this.io = io;
    this.gameService = gameService;
  }

  setChatSocketHandler(chatSocketHandler: ChatSocketHandler) {
    this.chatSocketHandler = chatSocketHandler;
  }

  initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      logToFile(`Client connected: ${socket.id}`);
      
      // Initialize chat handlers for this socket
      if (this.chatSocketHandler) {
        this.chatSocketHandler.initializeForSocket(socket);
      }

      socket.on('join-game', async (data) => {
        try {
          const { gameId, playerId } = data;
          console.log(`Player ${playerId} joining game ${gameId}`);
          logToFile(`Player ${playerId} joining game ${gameId}`);
          socket.join(gameId);

          const game = await this.gameService.getGame(gameId);
          socket.emit('game-state', game);
          socket.to(gameId).emit('player-joined', { playerId });
          logToFile(`Player ${playerId} joined game ${gameId} successfully`);
        } catch (error) {
          console.error(`Failed to join game:`, error);
          logToFile(`Failed to join game: ${(error as Error).message}`);
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('leave-game', async (data) => {
        try {
          const { gameId, playerId } = data;
          console.log(`Player ${playerId} leaving game ${gameId}`);
          logToFile(`Player ${playerId} leaving game ${gameId}`);
          socket.leave(gameId);

          socket.to(gameId).emit('player-left', { playerId });
          logToFile(`Player ${playerId} left game ${gameId} successfully`);
        } catch (error) {
          console.error('Failed to leave game:', error);
          logToFile(`Failed to leave game: ${(error as Error).message}`);
          socket.emit('error', { message: (error as Error).message });
        }
      });

      socket.on('game-action', async (data) => {
        let gameId: string | undefined;
        let action: string | undefined;
        let payload: any;

        try {
          ({ gameId, action, payload } = data);

          if (!gameId || !action) {
            throw new Error('Missing gameId or action');
          }

          logToFile(`Game action received: ${action} from player ${payload.playerId || 'unknown'} in game ${gameId}`);

          let updatedGame;
          switch (action) {
            // TODO: add an action to communicate with GPT
            case 'take-tokens':
              logToFile(`Processing take-tokens action for player ${payload.playerId} in game ${gameId}`);
              updatedGame = await this.gameService.takeTokens(gameId, payload.playerId, payload.tokens);
              break;
            case 'purchase-card':
              logToFile(`Processing purchase-card action for player ${payload.playerId} in game ${gameId}: card ${payload.cardId}`);
              updatedGame = await this.gameService.purchaseCard(gameId, payload.playerId, payload.cardId, payload.payment);
              break;
            case 'reserve-card':
              logToFile(`Processing reserve-card action for player ${payload.playerId} in game ${gameId}: card ${payload.cardId}`);
              updatedGame = await this.gameService.reserveCard(gameId, payload.playerId, payload.cardId);
              break;
            case 'purchase-reserved-card':
              logToFile(`Processing purchase-reserved-card action for player ${payload.playerId} in game ${gameId}: card ${payload.cardId}`);
              updatedGame = await this.gameService.purchaseReservedCard(gameId, payload.playerId, payload.cardId, payload.payment);
              break;
            case 'end-game':
              logToFile(`Processing end-game action for player ${payload.playerId} in game ${gameId}`);
              updatedGame = await this.gameService.endGame(gameId, payload.playerId);
              break;
            default:
              throw new Error('Unknown action');
          }

          console.log(`Broadcasting game state update for game ${gameId}`);
          logToFile(`Broadcasting game state update for game ${gameId} - Current player: ${updatedGame.currentPlayerIndex}, State: ${updatedGame.state}`);
          this.io.to(gameId).emit('game-state', updatedGame);
        } catch (actionError) {
          console.error('Error processing game action:', actionError);
          logToFile(`Error processing game action ${action || 'unknown'} for player ${payload?.playerId || 'unknown'} in game ${gameId || 'unknown'}: ${(actionError as Error).message}`);
          socket.emit('error', { message: (actionError as Error).message });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        logToFile(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
