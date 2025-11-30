/**
 * Friendship Repository - In-memory storage for friend relationships
 * Manages bidirectional friendships between users
 */
export class FriendshipRepository {
  // Map of userId -> Set of friend userIds (bidirectional)
  private friendships: Map<string, Set<string>> = new Map();

  /**
   * Add a friendship between two users (bidirectional)
   */
  addFriendship(userId1: string, userId2: string): void {
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
  }
}
