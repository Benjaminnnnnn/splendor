import { FriendshipRepository, FriendRequest } from '../domain/FriendshipRepository';

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
   * Send a friend request
   */
  sendFriendRequest(fromUserId: string, toUserId: string): void {
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }
    if (this.friendshipRepository.areFriends(fromUserId, toUserId)) {
      throw new Error('Already friends');
    }
    if (this.friendshipRepository.hasRequest(fromUserId, toUserId)) {
      throw new Error('Friend request already sent');
    }
    this.friendshipRepository.sendRequest(fromUserId, toUserId);
  }

  /**
   * Accept a friend request
   */
  acceptFriendRequest(fromUserId: string, toUserId: string): void {
    this.friendshipRepository.acceptRequest(fromUserId, toUserId);
  }

  /**
   * Reject a friend request
   */
  rejectFriendRequest(fromUserId: string, toUserId: string): void {
    this.friendshipRepository.rejectRequest(fromUserId, toUserId);
  }

  /**
   * Get pending friend requests for a user
   */
  getPendingRequests(userId: string): FriendRequest[] {
    return this.friendshipRepository.getPendingRequests(userId);
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
