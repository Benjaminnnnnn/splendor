import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { FriendshipController } from '../controllers/friendshipController';
import { ChatService } from '../services/chatService';
import { FriendshipService } from '../services/friendshipService';
import { UserService } from '../services/userService';
import { authenticateToken, optionalAuth } from '../middleware/auth';

export default function chatRoutes(chatService: ChatService, friendshipService: FriendshipService): Router {
  const router = Router();
  const userService = new UserService();
  const chatController = new ChatController(chatService, friendshipService);
  const friendshipController = new FriendshipController(friendshipService, userService);

  // Friendship endpoints - require authentication
  router.get('/users/:userId/friends', authenticateToken, friendshipController.getFriends);
  router.post('/users/:userId/friends', authenticateToken, friendshipController.addFriend);
  router.post('/users/:userId/friends/accept', authenticateToken, friendshipController.acceptFriend);
  router.post('/users/:userId/friends/reject', authenticateToken, friendshipController.rejectFriend);
  router.get('/users/:userId/friends/requests', authenticateToken, friendshipController.getPendingRequests);
  router.delete('/users/:userId/friends/:friendId', authenticateToken, friendshipController.removeFriend);
  router.get('/users/:userId/friends/:friendId/check', optionalAuth, friendshipController.checkFriendship);

  // Get direct message history between two users - require authentication
  router.get('/users/:userId/conversations/:peerId', authenticateToken, chatController.getDirectMessageHistory);

  return router;
}
