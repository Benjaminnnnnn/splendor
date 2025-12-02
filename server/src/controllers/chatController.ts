import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';
import { FriendshipService } from '../services/friendshipService';

export class ChatController {
  private chatService: ChatService;
  private friendshipService: FriendshipService;

  constructor(chatService: ChatService, friendshipService: FriendshipService) {
    this.chatService = chatService;
    this.friendshipService = friendshipService;
  }

  /**
   * GET /chat/users/:userId/conversations/:peerId
   * Get direct message history between two users
   */
  getDirectMessageHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, peerId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      // Verify authenticated user matches
      if (req.user && req.user.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to view this conversation' });
        return;
      }

      // Check if users are friends
      const areFriends = this.friendshipService.areFriends(userId, peerId);
      if (!areFriends) {
        res.status(403).json({ error: 'Can only view messages with friends' });
        return;
      }

      const messages = this.chatService.getDirectMessageHistory(userId, peerId, limit);

      res.json({ messages });
    } catch (error) {
      console.error('Error fetching message history:', error);
      res.status(500).json({ error: 'Failed to fetch message history' });
    }
  };

}
