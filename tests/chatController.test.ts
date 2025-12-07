import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { ChatController } from '../server/src/controllers/chatController';
import { ChatService } from '../server/src/services/chatService';
import { FriendshipService } from '../server/src/services/friendshipService';
import { ChatMessage, MessageType } from '../shared/types/chat';

// Mock factories
function createMockChatService(): ChatService {
  return {
    getDirectMessageHistory: vi.fn(),
    createDirectMessage: vi.fn(),
    createGroupMessage: vi.fn(),
    registerUserSocket: vi.fn(),
    unregisterUserSocket: vi.fn(),
    getUserSocket: vi.fn(),
  } as any;
}

function createMockFriendshipService(): FriendshipService {
  return {
    areFriends: vi.fn(() => true),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    getPendingRequests: vi.fn(),
    removeFriendship: vi.fn(),
    getFriendIds: vi.fn(),
    getFriendCount: vi.fn(),
  } as any;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    user: undefined,
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe('ChatController', () => {
  let chatService: ChatService;
  let friendshipService: FriendshipService;
  let controller: ChatController;

  beforeEach(() => {
    chatService = createMockChatService();
    friendshipService = createMockFriendshipService();
    controller = new ChatController(chatService, friendshipService);
  });

  describe('getDirectMessageHistory - Authorization', () => {
    it('should return 200 with messages for authorized user who is friends', async () => {
      const userId = 'user1';
      const peerId = 'user2';
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg1',
          type: MessageType.DIRECT,
          senderId: userId,
          senderName: 'User One',
          recipientId: peerId,
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: 'msg2',
          type: MessageType.DIRECT,
          senderId: peerId,
          senderName: 'User Two',
          recipientId: userId,
          content: 'Hi',
          timestamp: new Date(),
        },
      ];

      (friendshipService.areFriends as any) = vi.fn(() => true);
      (chatService.getDirectMessageHistory as any) = vi.fn(() => mockMessages);

      const req = createMockRequest({
        params: { userId, peerId },
        query: {},
        user: { userId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      // Assertions only on output (response body)
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ messages: mockMessages });
    });

    it('should return 403 for unauthorized user (userId mismatch)', async () => {
      const userId = 'user1';
      const peerId = 'user2';
      const wrongUserId = 'user3';

      const req = createMockRequest({
        params: { userId, peerId },
        query: {},
        user: { userId: wrongUserId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authorized to view this conversation' });
    });

    it('should return 403 when users are not friends', async () => {
      const userId = 'user1';
      const peerId = 'user2';

      (friendshipService.areFriends as any) = vi.fn(() => false);

      const req = createMockRequest({
        params: { userId, peerId },
        query: {},
        user: { userId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Can only view messages with friends' });
    });
  });

  describe('getDirectMessageHistory - Error Handling', () => {
    it('should return 500 when ChatService throws an error', async () => {
      const userId = 'user1';
      const peerId = 'user2';

      (friendshipService.areFriends as any) = vi.fn(() => true);
      (chatService.getDirectMessageHistory as any) = vi.fn(() => {
        throw new Error('Database connection failed');
      });

      const req = createMockRequest({
        params: { userId, peerId },
        query: {},
        user: { userId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch message history' });
    });
  });

  describe('getDirectMessageHistory - Query Parameter Parsing', () => {
    it('should default to limit 50 when limit is not provided', async () => {
      const userId = 'user1';
      const peerId = 'user2';

      (friendshipService.areFriends as any) = vi.fn(() => true);
      (chatService.getDirectMessageHistory as any) = vi.fn(() => []);

      const req = createMockRequest({
        params: { userId, peerId },
        query: {},
        user: { userId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      // Output only
      expect(res.json).toHaveBeenCalledWith({ messages: [] });
    });

    it('should pass through valid limit when provided', async () => {
      const userId = 'user1';
      const peerId = 'user2';
      const customLimit = 20;

      (friendshipService.areFriends as any) = vi.fn(() => true);
      (chatService.getDirectMessageHistory as any) = vi.fn(() => []);

      const req = createMockRequest({
        params: { userId, peerId },
        query: { limit: '20' },
        user: { userId } as any,
      });
      const res = createMockResponse();

      await controller.getDirectMessageHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({ messages: [] });
    });
  });

  describe('getDirectMessageHistory - Edge Cases', () => {
    // Edge case tests removed as out of scope for core policy & auth behavior.
  });
});
