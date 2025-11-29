import { ChatMessage, MessageType } from '../../../shared/types/chat';
import { ChatRepository } from '../domain/ChatRepository';
import { FriendshipService } from './friendshipService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat service layer - handles business logic for chat operations
 * Clean abstraction allows easy migration to persistent storage later
 */
export class ChatService {
  private chatRepository: ChatRepository;
  private friendshipService: FriendshipService;

  constructor(chatRepository: ChatRepository, friendshipService: FriendshipService) {
    this.chatRepository = chatRepository;
    this.friendshipService = friendshipService;
  }

  /**
   * Register a user's socket connection
   */
  registerUserSocket(userId: string, socketId: string): void {
    this.chatRepository.registerUserSocket(userId, socketId);
  }

  /**
   * Unregister a user's socket connection
   */
  unregisterUserSocket(userId: string, socketId: string): void {
    this.chatRepository.unregisterUserSocket(userId, socketId);
  }

  /**
   * Get all socket IDs for a user (for message delivery)
   */
  getUserSocket(userId: string): string | undefined {
    return this.chatRepository.getUserSocket(userId);
  }

  /**
   * Create a direct message
   */
  createDirectMessage(
    senderId: string,
    senderName: string,
    recipientId: string,
    content: string
  ): ChatMessage {
    console.log(`ChatService: Attempting to send message from ${senderId} to ${recipientId}`);
    
    // Check if users are friends before allowing message
    const areFriends = this.friendshipService.areFriends(senderId, recipientId);
    console.log(`ChatService: Are friends? ${areFriends}`);
    
    if (!areFriends) {
      console.error(`ChatService: Message blocked - ${senderId} and ${recipientId} are not friends`);
      throw new Error('Can only send messages to friends');
    }

    const message: ChatMessage = {
      id: uuidv4(),
      type: MessageType.DIRECT,
      senderId,
      senderName,
      recipientId,
      content,
      timestamp: new Date()
    };

    // Persist the message
    return this.chatRepository.saveDirectMessage(message);
  }

  /**
   * Create a group message (game chat)
   * Note: Group messages are NOT persisted, only broadcast
   */
  createGroupMessage(
    senderId: string,
    senderName: string,
    gameId: string,
    content: string
  ): ChatMessage {
    const message: ChatMessage = {
      id: uuidv4(),
      type: MessageType.GROUP,
      senderId,
      senderName,
      gameId,
      content,
      timestamp: new Date()
    };

    return message;
  }

  /**
   * Get direct message history between two users
   */
  getDirectMessageHistory(userId: string, peerId: string, limit: number = 50): ChatMessage[] {
    return this.chatRepository.getDirectMessageHistory(userId, peerId, limit);
  }

  /**
   * Get all conversations for a user
   */
  getUserConversations(userId: string): Map<string, ChatMessage[]> {
    return this.chatRepository.getUserConversations(userId);
  }
}
