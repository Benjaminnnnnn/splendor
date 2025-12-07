import { ChatMessage, MessageType } from '../../../shared/types/chat';
import { DatabaseConnection } from '../infrastructure/database';

export interface IChatRepository {
  saveDirectMessage(message: ChatMessage): ChatMessage;
  getDirectMessageHistory(userId1: string, userId2: string, limit?: number): ChatMessage[];
  clear(): void;
}

/**
 * Database-backed repository for chat messages
 * Stores messages in SQLite for persistence
 */
export class ChatRepository implements IChatRepository {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    // Allow dependency injection of the DB connection; default to singleton
    this.db = db ?? DatabaseConnection.getInstance();
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
   * Clear all data (useful for testing or reset)
   */
  clear(): void {
    this.db.run('DELETE FROM chat_messages');
  }
}
