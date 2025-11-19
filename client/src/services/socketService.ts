import { io, Socket } from 'socket.io-client';
import { Game } from '../../../shared/types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private gameStateCallback: ((game: Game) => void) | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL);

    this.socket.on('game-state', (game: Game) => {
      if (this.gameStateCallback) {
        this.gameStateCallback(game);
      }
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGame(gameId: string, playerId: string): void {
    if (this.socket) {
      this.socket.emit('join-game', { gameId, playerId });
    }
  }

  leaveGame(gameId: string, playerId: string): void {
    if (this.socket) {
      this.socket.emit('leave-game', { gameId, playerId });
    }
  }

  sendGameAction(gameId: string, action: string, payload: any): void {
    if (this.socket) {
      this.socket.emit('game-action', { gameId, action, payload });
    }
  }

  onGameStateUpdate(callback: (game: Game) => void): void {
    this.gameStateCallback = callback;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
