import { Request, Response } from 'express';
import { FriendshipService } from '../services/friendshipService';
import { UserService } from '../services/userService';

export class FriendshipController {
  private friendshipService: FriendshipService;
  private userService: UserService;

  constructor(friendshipService: FriendshipService, userService: UserService) {
    this.friendshipService = friendshipService;
    this.userService = userService;
  }

  /**
   * GET /api/chat/users/:userId/friends
   * Get all friends for a user with their details
   */
  getFriends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      // Verify authenticated user matches or has permission
      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to view this user\'s friends' });
        return;
      }

      const friendIds = this.friendshipService.getFriendIds(userId);
      
      // Fetch user details for each friend
      const friends = await Promise.all(
        friendIds.map(async (friendId) => {
          const user = await this.userService.getUserById(friendId);
          return user ? { id: user.id, username: user.username } : null;
        })
      );

      // Filter out any null values (in case user was deleted)
      const validFriends = friends.filter(f => f !== null);

      res.json({ friends: validFriends });
    } catch (error) {
      console.error('Error fetching friends:', error);
      res.status(500).json({ error: 'Failed to fetch friends' });
    }
  };

  /**
   * POST /api/chat/users/:userId/friends
   * Add a new friendship
   */
  addFriend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { friendId } = req.body;

      // Verify authenticated user matches
      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to add friends for this user' });
        return;
      }

      if (!friendId) {
        res.status(400).json({ error: 'friendId is required' });
        return;
      }

      // Verify both users exist
      const user = await this.userService.getUserById(userId);
      const friend = await this.userService.getUserById(friendId);

      if (!user || !friend) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      console.log(`FriendshipController: Adding friendship between ${userId} (${user.username}) and ${friendId} (${friend.username})`);
      this.friendshipService.addFriendship(userId, friendId);
      console.log(`FriendshipController: Friendship added successfully`);

      // Notify both users via socket about the new friendship
      const io = (req.app as any).get('io');
      const chatService = (req.app as any).get('chatService');
      if (io && chatService) {
        // Notify the user who sent the request
        const userSocket = chatService.getUserSocket(userId);
        if (userSocket) {
          io.to(userSocket).emit('friend:added', { id: friend.id, username: friend.username });
        }
        
        // Notify the friend who was added
        const friendSocket = chatService.getUserSocket(friendId);
        if (friendSocket) {
          io.to(friendSocket).emit('friend:added', { id: user.id, username: user.username });
        }
      }

      res.status(201).json({ 
        message: 'Friendship added successfully',
        friend: { id: friend.id, username: friend.username }
      });
    } catch (error) {
      console.error('Error adding friend:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * DELETE /api/chat/users/:userId/friends/:friendId
   * Remove a friendship
   */
  removeFriend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, friendId } = req.params;

      // Verify authenticated user matches
      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to remove friends for this user' });
        return;
      }

      this.friendshipService.removeFriendship(userId, friendId);

      res.json({ message: 'Friendship removed successfully' });
    } catch (error) {
      console.error('Error removing friend:', error);
      res.status(500).json({ error: 'Failed to remove friendship' });
    }
  };

  /**
   * GET /api/chat/users/:userId/friends/:friendId/check
   * Check if two users are friends
   */
  checkFriendship = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, friendId } = req.params;

      const areFriends = this.friendshipService.areFriends(userId, friendId);

      res.json({ areFriends });
    } catch (error) {
      console.error('Error checking friendship:', error);
      res.status(500).json({ error: 'Failed to check friendship' });
    }
  };
}
