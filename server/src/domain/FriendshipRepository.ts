import { DatabaseConnection } from '../infrastructure/database';

export interface FriendRequest {
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
}

/**
 * Database-backed Friendship Repository
 * Manages bidirectional friendships and friend requests using SQLite
 */
export class FriendshipRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Send a friend request
   */
  sendRequest(fromUserId: string, toUserId: string): void {
    // Check if already friends
    if (this.areFriends(fromUserId, toUserId)) {
      throw new Error('Users are already friends');
    }

    // Check if request already exists
    if (this.hasRequest(fromUserId, toUserId)) {
      throw new Error('Friend request already sent');
    }

    // Check if reverse request exists (they sent us one)
    if (this.hasRequest(toUserId, fromUserId)) {
      throw new Error('Friend request from this user already exists');
    }

    const createdAt = Date.now();
    this.db.run(
      'INSERT INTO friend_requests (from_user_id, to_user_id, created_at) VALUES (?, ?, ?)',
      [fromUserId, toUserId, createdAt]
    );
  }

  /**
   * Accept a friend request
   */
  acceptRequest(fromUserId: string, toUserId: string): void {
    // Verify request exists
    const request = this.db.get(
      'SELECT * FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );

    if (!request) {
      throw new Error('Friend request not found');
    }

    // Use transaction to ensure atomicity
    this.db.transaction(() => {
      // Delete the request
      this.db.run(
        'DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
        [fromUserId, toUserId]
      );

      // Add friendship (store both directions for easier querying)
      this.addFriendship(fromUserId, toUserId);
    });
  }

  /**
   * Reject a friend request
   */
  rejectRequest(fromUserId: string, toUserId: string): void {
    const result = this.db.run(
      'DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );

    if (result.changes === 0) {
      throw new Error('Friend request not found');
    }
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
   * Check if a friend request exists
   */
  hasRequest(fromUserId: string, toUserId: string): boolean {
    const result = this.db.get(
      'SELECT 1 FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?',
      [fromUserId, toUserId]
    );
    return !!result;
  }

  /**
   * Add a friendship (private helper, called after accepting request)
   */
  private addFriendship(userId1: string, userId2: string): void {
    const createdAt = Date.now();
    // Store in normalized order (smaller userId first)
    const [user1, user2] = [userId1, userId2].sort();
    
    try {
      this.db.run(
        'INSERT INTO friendships (user_id_1, user_id_2, created_at) VALUES (?, ?, ?)',
        [user1, user2, createdAt]
      );
    } catch (error: any) {
      // UNIQUE constraint violation means already friends
      if (error.code === 'SQLITE_CONSTRAINT') {
        return; // Already friends, no error
      }
      throw error;
    }
  }

  /**
   * Remove a friendship
   */
  removeFriendship(userId1: string, userId2: string): void {
    const [user1, user2] = [userId1, userId2].sort();
    this.db.run(
      'DELETE FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?',
      [user1, user2]
    );
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
