import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { Game } from '../../../shared/types/game';
import { ChatMessage, MessageType, SendMessageRequest } from '../../../shared/types/chat';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export interface ISocketService {
  connect(): void;
  disconnect(): void;
  registerForChat(userId: string, username: string): void;
  sendChatMessage(senderId: string, senderName: string, request: SendMessageRequest): void;
  onChatMessage(callback: (message: ChatMessage) => void): void;
  onUserTyping(callback: (data: { userId: string, username: string, gameId?: string }) => void): void;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
  isConnected(): boolean;
  joinGame(gameId: string, playerId: string): void;
  leaveGame(gameId: string, playerId: string): void;
  sendGameAction(gameId: string, action: string, payload: any): void;
}

class SocketService implements ISocketService {
  private socket: Socket | null = null;
  private gameStateCallback: ((game: Game) => void) | null = null;
  private chatMessageCallback: ((message: ChatMessage) => void) | null = null;
  private typingCallback: ((data: { userId: string, username: string, gameId?: string }) => void) | null = null;
  private readonly socketUrl: string;
  private readonly ioFactory: (url: string, opts?: Partial<ManagerOptions & SocketOptions>) => Socket;

  constructor(socketUrl: string = SOCKET_URL, ioFactory: (url: string, opts?: Partial<ManagerOptions & SocketOptions>) => Socket = io) {
    this.socketUrl = socketUrl;
    this.ioFactory = ioFactory;
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('SocketService: Already connected');
      return;
    }

    // If socket exists but is not connected, try to reconnect
    if (this.socket && !this.socket.connected) {
      console.log('SocketService: Socket exists but disconnected, reconnecting...');
      this.socket.connect();
      return;
    }

    console.log('SocketService: Creating new socket connection to', this.socketUrl);
    this.socket = this.ioFactory(this.socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('SocketService: Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      console.log('SocketService: Disconnected from socket server');
    });

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
    if (this.socket?.connected) {
      this.socket.emit('chat:register', { userId, username });
    } else {
      console.error('SocketService: Cannot register - socket not connected');
      // Try to connect if not connected
      this.connect();
      // Retry registration after a short delay
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit('chat:register', { userId, username });
        }
      }, 100);
    }
  }

  sendChatMessage(senderId: string, senderName: string, request: SendMessageRequest): void {
    console.log('SocketService: Sending chat message', { senderId, senderName, request, connected: this.socket?.connected });
    if (this.socket?.connected) {
      this.socket.emit('chat:send-message', {
        ...request,
        senderId,
        senderName
      });
    } else {
      console.error('SocketService: Cannot send message - socket not connected');
      // Try to reconnect
      this.connect();
      // Retry sending after connection
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit('chat:send-message', {
            ...request,
            senderId,
            senderName
          });
        } else {
          console.error('SocketService: Failed to send message after reconnect attempt');
        }
      }, 100);
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

  /**
   * Listen to a custom socket event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove listener for a custom socket event
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
