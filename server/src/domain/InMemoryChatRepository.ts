import { ChatMessage, MessageType } from '../../../shared/types/chat';

/**
 * In-memory repository for chat messages
 * DEPRECATED: This is the old in-memory implementation. Use ChatRepository (database-backed) instead.
 */
export class InMemoryChatRepository {
  // Store direct messages: Map<conversationKey, ChatMessage[]>
  // conversationKey is formed by sorting two userIds: "userId1:userId2"
  private directMessages: Map<string, ChatMessage[]> = new Map();
  
  // Store user socket mappings: Map<userId, socketId>
  // One socket per user (simplified)
  private userSockets: Map<string, string> = new Map();

  /**
   * Get conversation key for two users (always sorted for consistency)
   */
  private getConversationKey(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join(':');
  }

  /**
   * Register a socket connection for a user
   */
  registerUserSocket(userId: string, socketId: string): void {
    this.userSockets.set(userId, socketId);
  }

  /**
   * Unregister a socket connection for a user
   */
  unregisterUserSocket(userId: string, socketId: string): void {
    const existingSocketId = this.userSockets.get(userId);
    if (existingSocketId === socketId) {
      this.userSockets.delete(userId);
    }
  }

  /**
   * Get socket ID for a user
   */
  getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }

  /**
   * Save a direct message
   */
  saveDirectMessage(message: ChatMessage): ChatMessage {
    if (message.type !== MessageType.DIRECT || !message.recipientId) {
      throw new Error('Invalid direct message');
    }

    const key = this.getConversationKey(message.senderId, message.recipientId);
    if (!this.directMessages.has(key)) {
      this.directMessages.set(key, []);
    }

    this.directMessages.get(key)!.push(message);
    return message;
  }

  /**
   * Get direct message history between two users
   */
  getDirectMessageHistory(userId1: string, userId2: string, limit: number = 50): ChatMessage[] {
    const key = this.getConversationKey(userId1, userId2);
    const messages = this.directMessages.get(key) || [];
    
    // Return most recent messages (last N messages)
    return messages.slice(-limit);
  }

  /**
   * Clear all data (useful for testing or reset)
   */
  clear(): void {
    this.directMessages.clear();
    this.userSockets.clear();
  }
}
