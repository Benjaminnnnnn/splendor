export interface FriendRequest {
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
}

/**
 * In-memory Friendship Repository
 * DEPRECATED: This is the old in-memory implementation. Use FriendshipRepository (database-backed) instead.
 */
export class InMemoryFriendshipRepository {
  // Map of userId -> Set of friend userIds (bidirectional)
  private friendships: Map<string, Set<string>> = new Map();
  // Map of "fromUserId:toUserId" -> FriendRequest
  private friendRequests: Map<string, FriendRequest> = new Map();

  /**
   * Create a friend request (pure data operation)
   */
  createRequest(fromUserId: string, toUserId: string): void {
    const key = `${fromUserId}:${toUserId}`;
    this.friendRequests.set(key, { fromUserId, toUserId, createdAt: new Date() });
  }

  /**
   * Get a specific friend request
   */
  getRequest(fromUserId: string, toUserId: string): FriendRequest | null {
    const key = `${fromUserId}:${toUserId}`;
    return this.friendRequests.get(key) ?? null;
  }

  /**
   * Delete a friend request
   * @returns true if a request was deleted, false if not found
   */
  deleteRequest(fromUserId: string, toUserId: string): boolean {
    const key = `${fromUserId}:${toUserId}`;
    return this.friendRequests.delete(key);
  }

  /**
   * Get pending requests sent to a user
   */
  getPendingRequests(userId: string): FriendRequest[] {
    const requests: FriendRequest[] = [];
    for (const req of this.friendRequests.values()) {
      if (req.toUserId === userId) {
        requests.push(req);
      }
    }
    return requests;
  }

  /**
   * Create a friendship between two users (bidirectional)
   */
  createFriendship(userId1: string, userId2: string): void {
    console.log(`FriendshipRepository: Adding friendship between ${userId1} and ${userId2}`);
    
    // Initialize sets if they don't exist
    if (!this.friendships.has(userId1)) {
      this.friendships.set(userId1, new Set());
    }
    if (!this.friendships.has(userId2)) {
      this.friendships.set(userId2, new Set());
    }

    // Add bidirectional friendship
    this.friendships.get(userId1)!.add(userId2);
    this.friendships.get(userId2)!.add(userId1);
    
    console.log(`FriendshipRepository: ${userId1} now has friends:`, Array.from(this.friendships.get(userId1)!));
    console.log(`FriendshipRepository: ${userId2} now has friends:`, Array.from(this.friendships.get(userId2)!));
  }

  /**
   * Delete a friendship between two users (bidirectional)
   * @returns true if a friendship was deleted, false if not found
   */
  deleteFriendship(userId1: string, userId2: string): boolean {
    const had1 = this.friendships.get(userId1)?.delete(userId2) ?? false;
    const had2 = this.friendships.get(userId2)?.delete(userId1) ?? false;
    return had1 || had2;
  }

  /**
   * Get all friends for a user
   */
  getFriends(userId: string): string[] {
    const friends = this.friendships.get(userId);
    return friends ? Array.from(friends) : [];
  }

  /**
   * Check if two users are friends
   */
  areFriends(userId1: string, userId2: string): boolean {
    const result = this.friendships.get(userId1)?.has(userId2) ?? false;
    console.log(`FriendshipRepository: Checking if ${userId1} and ${userId2} are friends: ${result}`);
    console.log(`FriendshipRepository: ${userId1} friends:`, this.friendships.get(userId1) ? Array.from(this.friendships.get(userId1)!) : 'none');
    return result;
  }

  /**
   * Get count of friends for a user
   */
  getFriendCount(userId: string): number {
    return this.friendships.get(userId)?.size ?? 0;
  }

  /**
   * Clear all friendships (for testing)
   */
  clear(): void {
    this.friendships.clear();
    this.friendRequests.clear();
  }
}
