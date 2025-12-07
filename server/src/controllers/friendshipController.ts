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
      res.status(500).json({ error: 'Failed to fetch friends' });
    }
  };

  /**
   * POST /api/chat/users/:userId/friends
   * Send a friend request
   */
  addFriend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { friendId } = req.body;

      // Verify authenticated user matches
      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to send friend requests for this user' });
        return;
      }

      if (!friendId) {
        res.status(400).json({ error: 'friendId is required' });
        return;
      }

      // Verify friend exists
      const friend = await this.userService.getUserById(friendId);
      if (!friend) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.friendshipService.sendFriendRequest(userId, friendId);

      // Notify the recipient via socket
      const app = req.app as unknown as { get: (key: string) => unknown };
      const io = app.get('io');
      const chatService = app.get('chatService');
      if (io && chatService) {
        const recipientSocket = (chatService as { getUserSocket: (id: string) => string | undefined }).getUserSocket(friendId);
        if (recipientSocket) {
          const sender = await this.userService.getUserById(userId);
          (io as { to: (socket: string) => { emit: (event: string, data: unknown) => void } }).to(recipientSocket).emit('friend:request', { userId, username: sender?.username || 'Unknown' });
        }
      }

      res.status(201).json({ 
        message: 'Friend request sent',
        friend: { id: friend.id, username: friend.username }
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * POST /api/chat/users/:userId/friends/accept
   * Accept a friend request
   */
  acceptFriend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { friendId } = req.body;

      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      if (!friendId) {
        res.status(400).json({ error: 'friendId is required' });
        return;
      }

      this.friendshipService.acceptFriendRequest(friendId, userId);

      const user = await this.userService.getUserById(userId);
      const friend = await this.userService.getUserById(friendId);

      // Notify both users via socket
      const app = req.app as unknown as { get: (key: string) => unknown };
      const io = app.get('io');
      const chatService = app.get('chatService');
      if (io && chatService && user && friend) {
        const userSocket = (chatService as { getUserSocket: (id: string) => string | undefined }).getUserSocket(userId);
        if (userSocket) {
          (io as { to: (socket: string) => { emit: (event: string, data: unknown) => void } }).to(userSocket).emit('friend:added', { id: friend.id, username: friend.username });
        }
        
        const friendSocket = (chatService as { getUserSocket: (id: string) => string | undefined }).getUserSocket(friendId);
        if (friendSocket) {
          (io as { to: (socket: string) => { emit: (event: string, data: unknown) => void } }).to(friendSocket).emit('friend:added', { id: user.id, username: user.username });
        }
      }

      res.status(200).json({ message: 'Friend request accepted' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * POST /api/chat/users/:userId/friends/reject
   * Reject a friend request
   */
  rejectFriend = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { friendId } = req.body;

      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      if (!friendId) {
        res.status(400).json({ error: 'friendId is required' });
        return;
      }

      this.friendshipService.rejectFriendRequest(friendId, userId);
      
      // Notify the sender that their request was rejected
      const app = req.app as unknown as { get: (key: string) => unknown };
      const io = app.get('io');
      const chatService = app.get('chatService');
      if (io && chatService) {
        const senderSocket = (chatService as { getUserSocket: (id: string) => string | undefined }).getUserSocket(friendId);
        if (senderSocket) {
          (io as { to: (socket: string) => { emit: (event: string, data: unknown) => void } }).to(senderSocket).emit('friend:request-rejected', { userId });
        }
      }
      
      res.status(200).json({ message: 'Friend request rejected' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * GET /api/chat/users/:userId/friends/requests
   * Get pending friend requests
   */
  getPendingRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const requests = this.friendshipService.getPendingRequests(userId);
      
      // Enrich with user details
      const enrichedRequests = await Promise.all(
        requests.map(async (req) => {
          const user = await this.userService.getUserById(req.fromUserId);
          return {
            userId: req.fromUserId,
            username: user?.username || 'Unknown',
            createdAt: req.createdAt
          };
        })
      );
      
      res.status(200).json({ requests: enrichedRequests });
    } catch (error) {
      console.error('Error getting pending requests:', error);
      res.status(500).json({ error: 'Failed to get pending requests' });
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
      res.status(500).json({ error: 'Failed to check friendship status' });
    }
  };
}
