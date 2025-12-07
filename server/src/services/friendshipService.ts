import { IFriendshipRepository, FriendRequest } from '../domain/FriendshipRepository';

export interface Friend {
  id: string;
  username: string;
}

/**
 * Friendship service layer - handles business logic for friend operations
 */
export class FriendshipService {
  private friendshipRepository: IFriendshipRepository;

  constructor(friendshipRepository: IFriendshipRepository) {
    this.friendshipRepository = friendshipRepository;
  }

  /**
   * Send a friend request
   */
  sendFriendRequest(fromUserId: string, toUserId: string): void {
    // Business logic validations
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if already friends
    if (this.friendshipRepository.areFriends(fromUserId, toUserId)) {
      throw new Error('Users are already friends');
    }

    // Check if request already exists
    if (this.friendshipRepository.getRequest(fromUserId, toUserId)) {
      throw new Error('Friend request already sent');
    }

    // Check if reverse request exists (they sent us one)
    if (this.friendshipRepository.getRequest(toUserId, fromUserId)) {
      throw new Error('Friend request from this user already exists');
    }

    this.friendshipRepository.createRequest(fromUserId, toUserId);
  }

  /**
   * Accept a friend request
   */
  acceptFriendRequest(fromUserId: string, toUserId: string): void {
    // Verify request exists
    const request = this.friendshipRepository.getRequest(fromUserId, toUserId);
    if (!request) {
      throw new Error('Friend request not found');
    }

    // Delete the request and create friendship
    this.friendshipRepository.deleteRequest(fromUserId, toUserId);
    this.friendshipRepository.createFriendship(fromUserId, toUserId);
  }

  /**
   * Reject a friend request
   */
  rejectFriendRequest(fromUserId: string, toUserId: string): void {
    const deleted = this.friendshipRepository.deleteRequest(fromUserId, toUserId);
    if (!deleted) {
      throw new Error('Friend request not found');
    }
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
    const deleted = this.friendshipRepository.deleteFriendship(userId1, userId2);
    if (!deleted) {
      throw new Error('Friendship not found');
    }
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
