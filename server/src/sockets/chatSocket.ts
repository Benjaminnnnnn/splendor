import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chatService';
import { MessageType, SendMessageRequest } from '../../../shared/types/chat';

/**
 * Chat Socket Handler - manages real-time chat communications
 * Reuses existing Socket.IO infrastructure and game rooms
 */
export class ChatSocketHandler {
  private io: Server;
  private chatService: ChatService;

  constructor(io: Server, chatService: ChatService) {
    this.io = io;
    this.chatService = chatService;
  }

  /**
   * Initialize chat socket handlers for a connected socket
   * This is called when a user connects and provides their userId
   */
  initializeForSocket(socket: Socket) {
    // Register user socket mapping when user identifies themselves
    socket.on('chat:register', (data: { userId: string, username: string }) => {
      try {
        const { userId, username } = data;
        console.log(`Registering user ${username} (${userId}) with socket ${socket.id}`);
        
        this.chatService.registerUserSocket(userId, socket.id);
        
        // Store userId in socket data for later use
        socket.data.userId = userId;
        socket.data.username = username;
        
        socket.emit('chat:registered', { success: true });
      } catch (error) {
        console.error('Error registering user for chat:', error);
        socket.emit('error', { message: 'Failed to register for chat' });
      }
    });

    // Handle sending messages
    socket.on('chat:send-message', async (data: SendMessageRequest & { senderId: string, senderName: string }) => {
      console.log('Server: Received chat:send-message event', data);
      try {
        const { type, content, senderId, senderName, gameId, recipientId } = data;

        if (!content || !senderId || !senderName) {
          console.error('Server: Missing required message fields', { content, senderId, senderName });
          throw new Error('Missing required message fields');
        }

        if (type === MessageType.GROUP) {
          // Group message (game chat) - broadcast to game room
          if (!gameId) {
            console.error('Server: gameId required for group messages');
            throw new Error('gameId required for group messages');
          }

          console.log('Server: Creating group message for game', gameId);
          const message = this.chatService.createGroupMessage(
            senderId,
            senderName,
            gameId,
            content
          );

          console.log('Server: Broadcasting group message to game room', gameId);
          // Broadcast to all players in the game room (including sender)
          this.io.to(gameId).emit('chat:new-message', message);
          
          console.log(`Group message sent to game ${gameId} by ${senderName}`);
          
        } else if (type === MessageType.DIRECT) {
          // Direct message - send to specific user
          if (!recipientId) {
            throw new Error('recipientId required for direct messages');
          }

          // Create and persist the message
          const message = this.chatService.createDirectMessage(
            senderId,
            senderName,
            recipientId,
            content
          );

          // Get recipient's socket
          const recipientSocket = this.chatService.getUserSocket(recipientId);

          // Send to recipient's socket if they're online
          if (recipientSocket) {
            this.io.to(recipientSocket).emit('chat:new-message', message);
          }

          // Also send back to sender for confirmation/display
          socket.emit('chat:new-message', message);

          console.log(`Direct message sent from ${senderName} to user ${recipientId}`);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: (error as Error).message });
      }
    });

    // Handle typing indicators (optional enhancement)
    socket.on('chat:typing', (data: { gameId?: string, recipientId?: string }) => {
      try {
        const { gameId, recipientId } = data;
        const userId = socket.data.userId;
        const username = socket.data.username;

        if (gameId) {
          // Broadcast typing to game room (except sender)
          socket.to(gameId).emit('chat:user-typing', { userId, username, gameId });
        } else if (recipientId) {
          // Send typing to specific user
          const recipientSocket = this.chatService.getUserSocket(recipientId);
          if (recipientSocket) {
            this.io.to(recipientSocket).emit('chat:user-typing', { userId, username });
          }
        }
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // Handle disconnect - unregister user socket
    socket.on('disconnect', () => {
      try {
        const userId = socket.data.userId;
        if (userId) {
          console.log(`Unregistering socket ${socket.id} for user ${userId}`);
          this.chatService.unregisterUserSocket(userId, socket.id);
        }
      } catch (error) {
        console.error('Error unregistering user socket:', error);
      }
    });
  }
}
