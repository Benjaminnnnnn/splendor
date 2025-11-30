import { ChatMessage, MessageType } from '../../../shared/types/chat';
import { DatabaseConnection } from '../infrastructure/database';

/**
 * Database-backed repository for chat messages
 * Stores messages in SQLite for persistence
 */
export class ChatRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Save a direct message
   */
  saveDirectMessage(message: ChatMessage): ChatMessage {
    if (message.type !== MessageType.DIRECT || !message.recipientId) {
      throw new Error('Invalid direct message');
    }

    this.db.run(
      `INSERT INTO chat_messages (id, sender_id, sender_name, recipient_id, game_id, type, content, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.senderId,
        message.senderName,
        message.recipientId,
        message.gameId || null,
        message.type,
        message.content,
        message.timestamp.getTime(),
      ]
    );

    return message;
  }

  /**
   * Get direct message history between two users
   */
  getDirectMessageHistory(userId1: string, userId2: string, limit: number = 50): ChatMessage[] {
    const rows = this.db.query(
      `SELECT id, sender_id, sender_name, recipient_id, game_id, type, content, timestamp
       FROM chat_messages
       WHERE type = ? AND (
         (sender_id = ? AND recipient_id = ?) OR
         (sender_id = ? AND recipient_id = ?)
       )
       ORDER BY timestamp DESC
       LIMIT ?`,
      [MessageType.DIRECT, userId1, userId2, userId2, userId1, limit]
    );

    // Reverse to get chronological order (oldest first)
    return rows.reverse().map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      recipientId: row.recipient_id,
      gameId: row.game_id,
      type: row.type as MessageType,
      content: row.content,
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Get all conversations for a user (for friend list display)
   */
  getUserConversations(userId: string): Map<string, ChatMessage[]> {
    const conversations = new Map<string, ChatMessage[]>();
    
    // Get all messages where user is sender or recipient
    const rows = this.db.query(
      `SELECT id, sender_id, sender_name, recipient_id, game_id, type, content, timestamp
       FROM chat_messages
       WHERE type = ? AND (sender_id = ? OR recipient_id = ?)
       ORDER BY timestamp ASC`,
      [MessageType.DIRECT, userId, userId]
    );

    // Group messages by conversation
    for (const row of rows as any[]) {
      const otherUserId = row.sender_id === userId ? row.recipient_id : row.sender_id;
      
      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, []);
      }

      conversations.get(otherUserId)!.push({
        id: row.id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        recipientId: row.recipient_id,
        gameId: row.game_id,
        type: row.type as MessageType,
        content: row.content,
        timestamp: new Date(row.timestamp),
      });
    }
    
    return conversations;
  }

  /**
   * Clear all data (useful for testing or reset)
   */
  clear(): void {
    this.db.run('DELETE FROM chat_messages');
  }
}
