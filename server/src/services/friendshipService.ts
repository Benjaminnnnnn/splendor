import { FriendshipRepository } from '../domain/FriendshipRepository';

export interface Friend {
  id: string;
  username: string;
}

/**
 * Friendship service layer - handles business logic for friend operations
 */
export class FriendshipService {
  private friendshipRepository: FriendshipRepository;

  constructor(friendshipRepository: FriendshipRepository) {
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Add a friendship between two users
   */
  addFriendship(userId1: string, userId2: string): void {
    if (userId1 === userId2) {
      throw new Error('Cannot add yourself as a friend');
    }
    this.friendshipRepository.addFriendship(userId1, userId2);
  }

  /**
   * Remove a friendship between two users
   */
  removeFriendship(userId1: string, userId2: string): void {
    this.friendshipRepository.removeFriendship(userId1, userId2);
  }

  /**
   * Get all friend IDs for a user
   */
  getFriendIds(userId: string): string[] {
    return this.friendshipRepository.getFriends(userId);
  }

  /**
   * Check if two users are friends
   */
  areFriends(userId1: string, userId2: string): boolean {
    return this.friendshipRepository.areFriends(userId1, userId2);
  }

  /**
   * Get friend count for a user
   */
  getFriendCount(userId: string): number {
    return this.friendshipRepository.getFriendCount(userId);
  }
}
