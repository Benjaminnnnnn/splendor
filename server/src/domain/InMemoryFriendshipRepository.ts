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
   * Send a friend request
   */
  sendRequest(fromUserId: string, toUserId: string): void {
    const key = `${fromUserId}:${toUserId}`;
    this.friendRequests.set(key, { fromUserId, toUserId, createdAt: new Date() });
  }

  /**
   * Accept a friend request and create friendship
   */
  acceptRequest(fromUserId: string, toUserId: string): boolean {
    const key = `${fromUserId}:${toUserId}`;
    if (!this.friendRequests.has(key)) return false;
    
    this.friendRequests.delete(key);
    this.addFriendship(fromUserId, toUserId);
    return true;
  }

  /**
   * Reject a friend request
   */
  rejectRequest(fromUserId: string, toUserId: string): boolean {
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
   * Check if request already exists
   */
  hasRequest(fromUserId: string, toUserId: string): boolean {
    return this.friendRequests.has(`${fromUserId}:${toUserId}`);
  }

  /**
   * Add a friendship between two users (bidirectional)
   */
  private addFriendship(userId1: string, userId2: string): void {
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
   * Remove a friendship between two users (bidirectional)
   */
  removeFriendship(userId1: string, userId2: string): void {
    this.friendships.get(userId1)?.delete(userId2);
    this.friendships.get(userId2)?.delete(userId1);
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
