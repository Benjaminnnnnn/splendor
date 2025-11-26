import { io, Socket } from 'socket.io-client';
import { Game } from '../../../shared/types/game';
import { ChatMessage, MessageType, SendMessageRequest } from '../../../shared/types/chat';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private gameStateCallback: ((game: Game) => void) | null = null;
  private chatMessageCallback: ((message: ChatMessage) => void) | null = null;
  private typingCallback: ((data: { userId: string, username: string, gameId?: string }) => void) | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL);

    this.socket.on('game-state', (game: Game) => {
      if (this.gameStateCallback) {
        this.gameStateCallback(game);
      }
    });

        this.socket.on('chat:new-message', (message: ChatMessage) => {
      if (this.chatMessageCallback) {
        this.chatMessageCallback(message);
      }
    });

    this.socket.on('chat:user-typing', (data: { userId: string, username: string, gameId?: string }) => {
      if (this.typingCallback) {
        this.typingCallback(data);
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

    // Chat methods
  registerForChat(userId: string, username: string): void {
    console.log('SocketService: Registering for chat', { userId, username, connected: this.socket?.connected });
    if (this.socket) {
      this.socket.emit('chat:register', { userId, username });
    } else {
      console.error('SocketService: Cannot register - socket not connected');
    }
  }

  sendChatMessage(senderId: string, senderName: string, request: SendMessageRequest): void {
    console.log('SocketService: Sending chat message', { senderId, senderName, request, connected: this.socket?.connected });
    if (this.socket) {
      this.socket.emit('chat:send-message', {
        ...request,
        senderId,
        senderName
      });
    } else {
      console.error('SocketService: Cannot send message - socket not connected');
    }
  }

  sendTypingIndicator(gameId?: string, recipientId?: string): void {
    if (this.socket) {
      this.socket.emit('chat:typing', { gameId, recipientId });
    }
  }

  onChatMessage(callback: (message: ChatMessage) => void): void {
    // Replace the callback instead of adding multiple listeners
    this.chatMessageCallback = callback;
  }

  onUserTyping(callback: (data: { userId: string, username: string, gameId?: string }) => void): void {
    this.typingCallback = callback;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
