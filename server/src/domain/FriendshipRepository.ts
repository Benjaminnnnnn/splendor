import { DatabaseConnection } from '../infrastructure/database';

export interface FriendRequest {
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
}

export interface IFriendshipRepository {
  createRequest(fromUserId: string, toUserId: string): void;
  deleteRequest(fromUserId: string, toUserId: string): boolean;
  getRequest(fromUserId: string, toUserId: string): FriendRequest | null;
  getPendingRequests(userId: string): FriendRequest[];
  createFriendship(userId1: string, userId2: string): void;
  deleteFriendship(userId1: string, userId2: string): boolean;
  getFriends(userId: string): string[];
  areFriends(userId1: string, userId2: string): boolean;
  getFriendCount(userId: string): number;
  clear(): void;
}

/**
 * Database-backed Friendship Repository
 * Manages bidirectional friendships and friend requests using SQLite
 */
export class FriendshipRepository implements IFriendshipRepository {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    // Allow dependency injection of the DB connection; default to singleton
    this.db = db ?? DatabaseConnection.getInstance();
  }

  /**
   * Create a friend request (pure data operation)
   */
  createRequest(fromUserId: string, toUserId: string): void {
    const createdAt = Date.now();
    this.db.run(
      'INSERT INTO friend_requests (from_user_id, to_user_id, created_at) VALUES (?, ?, ?)',
      [fromUserId, toUserId, createdAt]
    );
  }

  /**
   * Get a specific friend request
   */
  getRequest(fromUserId: string, toUserId: string): FriendRequest | null {
    const row = this.db.get(
      'SELECT from_user_id, to_user_id, created_at FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );

    if (!row) {
      return null;
    }

    return {
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Delete a friend request
   * @returns true if a request was deleted, false if not found
   */
  deleteRequest(fromUserId: string, toUserId: string): boolean {
    const result = this.db.run(
      'DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );
    return result.changes > 0;
  }

  /**
   * Get all pending friend requests for a user (requests sent TO them)
   */
  getPendingRequests(userId: string): FriendRequest[] {
    const rows = this.db.query(
      'SELECT from_user_id, to_user_id, created_at FROM friend_requests WHERE to_user_id = ?',
      [userId]
    );

    return rows.map((row: any) => ({
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      createdAt: new Date(row.created_at),
    }));
  }



  /**
   * Create a friendship (pure data operation)
   */
  createFriendship(userId1: string, userId2: string): void {
    const createdAt = Date.now();
    // Store in normalized order (smaller userId first)
    const [user1, user2] = [userId1, userId2].sort();
    
    this.db.run(
      'INSERT INTO friendships (user_id_1, user_id_2, created_at) VALUES (?, ?, ?)',
      [user1, user2, createdAt]
    );
  }

  /**
   * Delete a friendship
   * @returns true if a friendship was deleted, false if not found
   */
  deleteFriendship(userId1: string, userId2: string): boolean {
    const [user1, user2] = [userId1, userId2].sort();
    const result = this.db.run(
      'DELETE FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?',
      [user1, user2]
    );
    return result.changes > 0;
  }

  /**
   * Get all friends for a user
   */
  getFriends(userId: string): string[] {
    const rows = this.db.query(
      `SELECT 
        CASE 
          WHEN user_id_1 = ? THEN user_id_2 
          ELSE user_id_1 
        END as friend_id
       FROM friendships 
       WHERE user_id_1 = ? OR user_id_2 = ?`,
      [userId, userId, userId]
    );

    return rows.map((row: any) => row.friend_id);
  }

  /**
   * Check if two users are friends
   */
  areFriends(userId1: string, userId2: string): boolean {
    const [user1, user2] = [userId1, userId2].sort();
    const result = this.db.get(
      'SELECT 1 FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?',
      [user1, user2]
    );
    return !!result;
  }

  /**
   * Get friend count for a user
   */
  getFriendCount(userId: string): number {
    const result = this.db.get(
      'SELECT COUNT(*) as count FROM friendships WHERE user_id_1 = ? OR user_id_2 = ?',
      [userId, userId]
    );
    return result ? result.count : 0;
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.db.run('DELETE FROM friendships');
    this.db.run('DELETE FROM friend_requests');
  }
}
