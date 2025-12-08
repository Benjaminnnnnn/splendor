import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from '../server/src/services/chatService';
import { IChatRepository } from '../server/src/domain/ChatRepository';
import { IFriendshipRepository } from '../server/src/domain/FriendshipRepository';
import { SocketManager } from '../server/src/domain/SocketManager';
import { FriendshipService } from '../server/src/services/friendshipService';
import { ChatMessage, MessageType } from '../shared/types/chat';
import { createMockChatRepository, createMockFriendshipRepository } from './helpers/mocks';

describe('ChatService - Extended Tests', () => {
  let chatService: ChatService;
  let chatRepo: IChatRepository;
  let friendshipRepo: IFriendshipRepository;
  let socketManager: SocketManager;
  let friendshipService: FriendshipService;

  const testUsers = {
    alice: { id: 'user-alice', name: 'Alice' },
    bob: { id: 'user-bob', name: 'Bob' },
    charlie: { id: 'user-charlie', name: 'Charlie' }
  };

  beforeEach(() => {
    const { mock: chatMock } = createMockChatRepository();
    chatRepo = chatMock;
    friendshipRepo = createMockFriendshipRepository(true);
    socketManager = new SocketManager();
    friendshipService = new FriendshipService(friendshipRepo);
    chatService = new ChatService(chatRepo, socketManager, friendshipService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Socket Management', () => {
    it('should register user socket connection', () => {
      const socketId = 'socket-123';
      const userId = testUsers.alice.id;

      chatService.registerUserSocket(userId, socketId);
      
      // Verify socket was registered by checking if we can retrieve it
      const retrievedSocketId = chatService.getUserSocket(userId);
      expect(retrievedSocketId).toBe(socketId);
    });

    it('should unregister user socket connection', () => {
      const socketId = 'socket-456';
      const userId = testUsers.bob.id;

      // First register the socket
      chatService.registerUserSocket(userId, socketId);
      expect(chatService.getUserSocket(userId)).toBe(socketId);

      // Then unregister it
      chatService.unregisterUserSocket(userId, socketId);
      expect(chatService.getUserSocket(userId)).toBeUndefined();
    });

    it('should handle multiple users with different sockets', () => {
      const aliceSocket = 'socket-alice';
      const bobSocket = 'socket-bob';
      const charlieSocket = 'socket-charlie';

      chatService.registerUserSocket(testUsers.alice.id, aliceSocket);
      chatService.registerUserSocket(testUsers.bob.id, bobSocket);
      chatService.registerUserSocket(testUsers.charlie.id, charlieSocket);

      expect(chatService.getUserSocket(testUsers.alice.id)).toBe(aliceSocket);
      expect(chatService.getUserSocket(testUsers.bob.id)).toBe(bobSocket);
      expect(chatService.getUserSocket(testUsers.charlie.id)).toBe(charlieSocket);
    });

    it('should return undefined for non-existent user socket', () => {
      const result = chatService.getUserSocket('non-existent-user');
      expect(result).toBeUndefined();
    });

    it('should replace socket when same user registers new socket', () => {
      const oldSocket = 'socket-old';
      const newSocket = 'socket-new';
      const userId = testUsers.alice.id;

      chatService.registerUserSocket(userId, oldSocket);
      expect(chatService.getUserSocket(userId)).toBe(oldSocket);

      chatService.registerUserSocket(userId, newSocket);
      expect(chatService.getUserSocket(userId)).toBe(newSocket);
    });

    it('should not unregister socket if socket ID does not match', () => {
      const correctSocket = 'socket-correct';
      const wrongSocket = 'socket-wrong';
      const userId = testUsers.alice.id;

      chatService.registerUserSocket(userId, correctSocket);
      chatService.unregisterUserSocket(userId, wrongSocket);
      
      // Socket should still be registered
      expect(chatService.getUserSocket(userId)).toBe(correctSocket);
    });
  });

  describe('Direct Message Creation - Edge Cases', () => {
    it('should generate unique message IDs for multiple messages', () => {
      const content1 = 'First message';
      const content2 = 'Second message';

      const message1 = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        content1
      );
      const message2 = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        content2
      );

      expect(message1.id).toBeTruthy();
      expect(message2.id).toBeTruthy();
      expect(message1.id).not.toBe(message2.id);
    });

    it('should set timestamp for each message', () => {
      const beforeTime = new Date();
      
      const message = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        'Test message'
      );

      const afterTime = new Date();

      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw error when trying to message non-friends', () => {
      // Create service with non-friend repository
      const nonFriendRepo = createMockFriendshipRepository(false);
      const nonFriendService = new FriendshipService(nonFriendRepo);
      const restrictedChatService = new ChatService(chatRepo, socketManager, nonFriendService);

      expect(() => {
        restrictedChatService.createDirectMessage(
          testUsers.alice.id, 
          testUsers.alice.name, 
          testUsers.charlie.id, 
          'Should fail'
        );
      }).toThrow('Can only send messages to friends');
    });

    it('should handle empty message content', () => {
      const message = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        ''
      );

      expect(message.content).toBe('');
      expect(message.id).toBeTruthy();
      expect(message.type).toBe(MessageType.DIRECT);
    });

    it('should handle long message content', () => {
      const longContent = 'a'.repeat(1000);
      const message = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        longContent
      );

      expect(message.content).toBe(longContent);
      expect(message.content.length).toBe(1000);
    });

    it('should preserve all message properties correctly', () => {
      const content = 'Test message';
      const message = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        content
      );

      expect(message.type).toBe(MessageType.DIRECT);
      expect(message.senderId).toBe(testUsers.alice.id);
      expect(message.senderName).toBe(testUsers.alice.name);
      expect(message.recipientId).toBe(testUsers.bob.id);
      expect(message.content).toBe(content);
      expect(message.gameId).toBeUndefined();
    });
  });

  describe('Group Message Creation - Edge Cases', () => {
    it('should create group message without friendship check', () => {
      // Use non-friend repository to ensure friendship is not checked for group messages
      const nonFriendRepo = createMockFriendshipRepository(false);
      const nonFriendService = new FriendshipService(nonFriendRepo);
      const groupChatService = new ChatService(chatRepo, socketManager, nonFriendService);

      const message = groupChatService.createGroupMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        'game-123', 
        'Group message'
      );

      expect(message).toBeDefined();
      expect(message.type).toBe(MessageType.GROUP);
      // Verify friendship was not checked
      expect(nonFriendRepo.areFriends).not.toHaveBeenCalled();
    });

    it('should generate unique IDs for group messages', () => {
      const gameId = 'game-456';
      const message1 = chatService.createGroupMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        gameId, 
        'First group message'
      );
      const message2 = chatService.createGroupMessage(
        testUsers.bob.id, 
        testUsers.bob.name, 
        gameId, 
        'Second group message'
      );

      expect(message1.id).toBeTruthy();
      expect(message2.id).toBeTruthy();
      expect(message1.id).not.toBe(message2.id);
    });

    it('should preserve game ID in group messages', () => {
      const gameId = 'special-game-789';
      const message = chatService.createGroupMessage(
        testUsers.charlie.id, 
        testUsers.charlie.name, 
        gameId, 
        'Game-specific message'
      );

      expect(message.gameId).toBe(gameId);
      expect(message.recipientId).toBeUndefined();
    });

    it('should handle empty content in group messages', () => {
      const message = chatService.createGroupMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        'game-empty', 
        ''
      );

      expect(message.content).toBe('');
      expect(message.type).toBe(MessageType.GROUP);
    });
  });

  describe('Message History Retrieval', () => {
    it('should call repository with correct parameters for message history', () => {
      const userId = testUsers.alice.id;
      const peerId = testUsers.bob.id;
      const limit = 25;

      chatService.getDirectMessageHistory(userId, peerId, limit);

      expect(chatRepo.getDirectMessageHistory).toHaveBeenCalledWith(userId, peerId, limit);
    });

    it('should use default limit when not specified', () => {
      const userId = testUsers.alice.id;
      const peerId = testUsers.bob.id;

      chatService.getDirectMessageHistory(userId, peerId);

      expect(chatRepo.getDirectMessageHistory).toHaveBeenCalledWith(userId, peerId, 50);
    });

    it('should return repository result directly', () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          type: MessageType.DIRECT,
          senderId: testUsers.alice.id,
          senderName: testUsers.alice.name,
          recipientId: testUsers.bob.id,
          content: 'Test message',
          timestamp: new Date()
        }
      ];

      vi.mocked(chatRepo.getDirectMessageHistory).mockReturnValue(mockMessages);

      const result = chatService.getDirectMessageHistory(testUsers.alice.id, testUsers.bob.id);

      expect(result).toBe(mockMessages);
    });

    it('should handle zero limit', () => {
      chatService.getDirectMessageHistory(testUsers.alice.id, testUsers.bob.id, 0);

      expect(chatRepo.getDirectMessageHistory).toHaveBeenCalledWith(
        testUsers.alice.id, 
        testUsers.bob.id, 
        0
      );
    });

    it('should handle very large limit', () => {
      const largeLimit = 999999;
      chatService.getDirectMessageHistory(testUsers.alice.id, testUsers.bob.id, largeLimit);

      expect(chatRepo.getDirectMessageHistory).toHaveBeenCalledWith(
        testUsers.alice.id, 
        testUsers.bob.id, 
        largeLimit
      );
    });
  });

  describe('Service Integration', () => {
    it('should work with real SocketManager instance', () => {
      const realSocketManager = new SocketManager();
      const integratedService = new ChatService(chatRepo, realSocketManager, friendshipService);

      // Test socket operations
      integratedService.registerUserSocket('user-1', 'socket-1');
      expect(integratedService.getUserSocket('user-1')).toBe('socket-1');

      // Test message creation still works
      const message = integratedService.createDirectMessage(
        testUsers.alice.id,
        testUsers.alice.name,
        testUsers.bob.id,
        'Integration test'
      );

      expect(message).toBeDefined();
      expect(message.type).toBe(MessageType.DIRECT);
    });

    it('should properly coordinate with friendship service', () => {
      // Test that friendship check is actually called
      chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        'Friend test'
      );

      expect(friendshipRepo.areFriends).toHaveBeenCalledWith(
        testUsers.alice.id, 
        testUsers.bob.id
      );
    });

    it('should maintain independent socket state per user', () => {
      // Register multiple users
      chatService.registerUserSocket('user-1', 'socket-1');
      chatService.registerUserSocket('user-2', 'socket-2');
      chatService.registerUserSocket('user-3', 'socket-3');

      // Unregister one user
      chatService.unregisterUserSocket('user-2', 'socket-2');

      // Others should remain
      expect(chatService.getUserSocket('user-1')).toBe('socket-1');
      expect(chatService.getUserSocket('user-2')).toBeUndefined();
      expect(chatService.getUserSocket('user-3')).toBe('socket-3');
    });
  });

  describe('Error Conditions and Boundary Cases', () => {
    it('should handle null or undefined userIds gracefully in socket operations', () => {
      // These should not throw, but might not work as expected
      expect(() => {
        chatService.registerUserSocket('', 'socket-empty');
        chatService.getUserSocket('');
      }).not.toThrow();
    });

    it('should handle special characters in message content', () => {
      const specialContent = '🎮 Special chars: <>&"\'`\n\t\r';
      const message = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        specialContent
      );

      expect(message.content).toBe(specialContent);
    });

    it('should handle very long user names and IDs', () => {
      const longId = 'user-' + 'a'.repeat(100);
      const longName = 'Name-' + 'b'.repeat(100);
      
      const message = chatService.createDirectMessage(
        longId, 
        longName, 
        testUsers.bob.id, 
        'Long name test'
      );

      expect(message.senderId).toBe(longId);
      expect(message.senderName).toBe(longName);
    });

    it('should handle friendship service errors gracefully', () => {
      // Mock friendship service to throw
      vi.mocked(friendshipRepo.areFriends).mockImplementation(() => {
        throw new Error('Friendship service error');
      });

      expect(() => {
        chatService.createDirectMessage(
          testUsers.alice.id, 
          testUsers.alice.name, 
          testUsers.bob.id, 
          'Should fail'
        );
      }).toThrow('Friendship service error');
    });

    it('should handle repository errors during message save', () => {
      // Mock repository to throw
      vi.mocked(chatRepo.saveDirectMessage).mockImplementation(() => {
        throw new Error('Database error');
      });

      expect(() => {
        chatService.createDirectMessage(
          testUsers.alice.id, 
          testUsers.alice.name, 
          testUsers.bob.id, 
          'Should fail'
        );
      }).toThrow('Database error');
    });
  });

  describe('Performance and Concurrency Considerations', () => {
    it('should handle rapid successive message creation', () => {
      const messageCount = 100;
      const messages: ChatMessage[] = [];

      for (let i = 0; i < messageCount; i++) {
        const message = chatService.createDirectMessage(
          testUsers.alice.id, 
          testUsers.alice.name, 
          testUsers.bob.id, 
          `Message ${i}`
        );
        messages.push(message);
      }

      // All messages should have unique IDs
      const uniqueIds = new Set(messages.map(m => m.id));
      expect(uniqueIds.size).toBe(messageCount);

      // Repository should have been called for each message
      expect(chatRepo.saveDirectMessage).toHaveBeenCalledTimes(messageCount);
    });

    it('should handle rapid socket registration/unregistration', () => {
      const iterations = 50;
      const userId = 'stress-test-user';

      for (let i = 0; i < iterations; i++) {
        const socketId = `socket-${i}`;
        chatService.registerUserSocket(userId, socketId);
        expect(chatService.getUserSocket(userId)).toBe(socketId);
        chatService.unregisterUserSocket(userId, socketId);
        expect(chatService.getUserSocket(userId)).toBeUndefined();
      }
    });

    it('should maintain data consistency during mixed operations', () => {
      // Mix socket operations with message creation
      chatService.registerUserSocket(testUsers.alice.id, 'socket-alice');
      
      const message1 = chatService.createDirectMessage(
        testUsers.alice.id, 
        testUsers.alice.name, 
        testUsers.bob.id, 
        'First'
      );

      chatService.registerUserSocket(testUsers.bob.id, 'socket-bob');
      
      const message2 = chatService.createGroupMessage(
        testUsers.bob.id, 
        testUsers.bob.name, 
        'game-123', 
        'Group'
      );

      chatService.getDirectMessageHistory(testUsers.alice.id, testUsers.bob.id);

      // All operations should complete successfully
      expect(message1.type).toBe(MessageType.DIRECT);
      expect(message2.type).toBe(MessageType.GROUP);
      expect(chatService.getUserSocket(testUsers.alice.id)).toBe('socket-alice');
      expect(chatService.getUserSocket(testUsers.bob.id)).toBe('socket-bob');
    });
  });
});