import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseConnection } from '../server/src/infrastructure/database';
import { ChatRepository } from '../server/src/domain/ChatRepository';
import { FriendshipRepository } from '../server/src/domain/FriendshipRepository';
import { SqliteUserRepository } from '../server/src/repositories/userRepository';
import { ChatService } from '../server/src/services/chatService';
import { FriendshipService } from '../server/src/services/friendshipService';
import { UserService } from '../server/src/services/userService';
import { SocketManager } from '../server/src/domain/SocketManager';
import { ChatController } from '../server/src/controllers/chatController';
import { FriendshipController } from '../server/src/controllers/friendshipController';
import { MessageType } from '../shared/types/chat';

/**
 * Integration Test Plan: Chat & Friend Subsystem
 * 
 * These tests verify the integration between controllers, services, and repositories
 * using a real SQLite database. Tests start at the controller level.
 */
describe('Chat & Friend Subsystem - Integration Tests', () => {
  const TEST_DB_PATH = path.join(__dirname, '../server/data/splendor-chat-test.db');
  let db: DatabaseConnection;
  let chatRepo: ChatRepository;
  let friendshipRepo: FriendshipRepository;
  let chatService: ChatService;
  let friendshipService: FriendshipService;
  let userService: UserService;
  let socketManager: SocketManager;
  let chatController: ChatController;
  let friendshipController: FriendshipController;

  // Test users
  const userA = { id: 'user-a', name: 'Alice', email: 'alice@test.com' };
  const userB = { id: 'user-b', name: 'Bob', email: 'bob@test.com' };
  const userC = { id: 'user-c', name: 'Charlie', email: 'charlie@test.com' };
  const userD = { id: 'user-d', name: 'Diana', email: 'diana@test.com' };
  
  // Test games
  const game1 = 'game-123';
  const game2 = 'game-456';

  // Mock request/response helpers
  function createMockRequest(overrides: any = {}): any {
    return {
      params: {},
      query: {},
      body: {},
      user: undefined,
      app: {
        get: (key: string) => {
          if (key === 'io') return null;
          if (key === 'chatService') return chatService;
          return null;
        }
      },
      ...overrides,
    };
  }

  function createMockResponse(): any {
    const res: any = { _status: undefined, _json: undefined };
    res.status = function(code: number) {
      res._status = code;
      return res;
    };
    res.json = function(data: any) {
      res._json = data;
      return res;
    };
    res.send = function(data: any) {
      return res;
    };
    return res;
  }

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create fresh database connection
    db = DatabaseConnection.createAtPath(TEST_DB_PATH);
    
    // Create test users in the database (required for foreign key constraints)
    const now = Date.now();
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [userA.id, userA.name, userA.email, 'hash', now]
    );
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [userB.id, userB.name, userB.email, 'hash', now]
    );
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [userC.id, userC.name, userC.email, 'hash', now]
    );
    db.run(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      [userD.id, userD.name, userD.email, 'hash', now]
    );
    
    // Initialize repositories
    chatRepo = new ChatRepository(db);
    friendshipRepo = new FriendshipRepository(db);
    const userRepo = new SqliteUserRepository(db);
    
    // Initialize services
    socketManager = new SocketManager();
    friendshipService = new FriendshipService(friendshipRepo);
    chatService = new ChatService(chatRepo, socketManager, friendshipService);
    userService = new UserService(userRepo);
    
    // Initialize controllers
    chatController = new ChatController(chatService, friendshipService);
    friendshipController = new FriendshipController(friendshipService, userService);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('A. Group Chat (Within a Match)', () => {
    describe('1. Message Delivery (Happy Path)', () => {
      it('all match participants receive messages in order', () => {
        const msg1 = chatService.createGroupMessage(userA.id, userA.name, game1, 'Hello everyone!');
        const msg2 = chatService.createGroupMessage(userB.id, userB.name, game1, 'Hi Alice!');

        expect(msg1.type).toBe(MessageType.GROUP);
        expect(msg1.gameId).toBe(game1);
        expect(msg2.timestamp.getTime()).toBeGreaterThanOrEqual(msg1.timestamp.getTime());
      });
    });
  });

  describe('B. Direct Messaging (Between Friends)', () => {
    beforeEach(() => {
      // Create friendship via repository
      friendshipRepo.createFriendship(userA.id, userB.id);
    });

    describe('1. Message Delivery (Happy Path)', () => {
      it('approved friends exchange messages', async () => {
        // Insert test messages via repository
        const now = Date.now();
        chatRepo.saveDirectMessage({
          id: 'msg1',
          senderId: userA.id,
          senderName: userA.name,
          recipientId: userB.id,
          type: MessageType.DIRECT,
          content: 'Hi Bob!',
          timestamp: new Date(now),
        });
        chatRepo.saveDirectMessage({
          id: 'msg2',
          senderId: userB.id,
          senderName: userB.name,
          recipientId: userA.id,
          type: MessageType.DIRECT,
          content: 'Hey Alice!',
          timestamp: new Date(now + 1),
        });
        chatRepo.saveDirectMessage({
          id: 'msg3',
          senderId: userA.id,
          senderName: userA.name,
          recipientId: userB.id,
          type: MessageType.DIRECT,
          content: 'How are you?',
          timestamp: new Date(now + 2),
        });

        const req = createMockRequest({
          params: { userId: userA.id, peerId: userB.id },
          query: {},
          user: { userId: userA.id },
        });
        const res = createMockResponse();
        
        await chatController.getDirectMessageHistory(req, res);
        
        expect(res._json.messages).toHaveLength(3);
        expect(res._json.messages[0].id).toBe('msg1');
      });

      it('only the two friends can send/receive messages', async () => {
        // Insert test message via repository
        chatRepo.saveDirectMessage({
          id: 'msg1',
          senderId: userA.id,
          senderName: userA.name,
          recipientId: userB.id,
          type: MessageType.DIRECT,
          content: 'Private message',
          timestamp: new Date(),
        });

        // Verify the message is only visible to A and B via controller
        const req1 = createMockRequest({
          params: { userId: userA.id, peerId: userB.id },
          query: {},
          user: { userId: userA.id },
        });
        const res1 = createMockResponse();
        await chatController.getDirectMessageHistory(req1, res1);
        expect(res1._json.messages).toHaveLength(1);

        // Verify userC (not involved) cannot see the message
        const req2 = createMockRequest({
          params: { userId: userA.id, peerId: userC.id },
          query: {},
          user: { userId: userA.id },
        });
        const res2 = createMockResponse();
        await chatController.getDirectMessageHistory(req2, res2);
        
        // Should return 403 because they're not friends
        expect(res2._status).toBe(403);
      });
    });

    describe('2. Unauthorized Messaging', () => {
      it('user tries to message a non-friend user', () => {
        // Attempt to send message should throw (at service level)
        expect(() => {
          chatService.createDirectMessage(userA.id, userA.name, userC.id, 'Unauthorized message');
        }).toThrow();
      });
    });

    describe('3. Message Persistence', () => {
      it('messages are available after logout/login or page reload', async () => {
        // Insert test messages via repository
        const now = Date.now();
        chatRepo.saveDirectMessage({
          id: 'msg1',
          senderId: userA.id,
          senderName: userA.name,
          recipientId: userB.id,
          type: MessageType.DIRECT,
          content: 'Message 1',
          timestamp: new Date(now),
        });
        chatRepo.saveDirectMessage({
          id: 'msg2',
          senderId: userB.id,
          senderName: userB.name,
          recipientId: userA.id,
          type: MessageType.DIRECT,
          content: 'Message 2',
          timestamp: new Date(now + 1),
        });
        chatRepo.saveDirectMessage({
          id: 'msg3',
          senderId: userA.id,
          senderName: userA.name,
          recipientId: userB.id,
          type: MessageType.DIRECT,
          content: 'Message 3',
          timestamp: new Date(now + 2),
        });

        const newChatRepo = new ChatRepository(db);
        const newSocketManager = new SocketManager();
        const newFriendshipRepo = new FriendshipRepository(db);
        const newFriendshipService = new FriendshipService(newFriendshipRepo);
        const newChatService = new ChatService(newChatRepo, newSocketManager, newFriendshipService);
        const newChatController = new ChatController(newChatService, newFriendshipService);

        // Retrieve messages from new controller instance
        const req = createMockRequest({
          params: { userId: userA.id, peerId: userB.id },
          query: {},
          user: { userId: userA.id },
        });
        const res = createMockResponse();
        await newChatController.getDirectMessageHistory(req, res);

        expect(res._json.messages).toHaveLength(3);
        expect(res._json.messages[2].content).toBe('Message 3');
      });
    });
  });

  describe('C. Friend Request Workflow', () => {
    describe('1. Request Creation (Happy Path)', () => {
      it('user sends a friend request to another user', async () => {
        // Send friend request via controller
        const req = createMockRequest({
          params: { userId: userA.id },
          body: { friendId: userB.id },
          user: { userId: userA.id },
        });
        const res = createMockResponse();
        
        await friendshipController.addFriend(req, res);

        expect(res._status).toBe(201);

        // Verify friend request was created in repository
        const pendingRequests = friendshipRepo.getPendingRequests(userB.id);
        expect(pendingRequests).toHaveLength(1);
        expect(pendingRequests[0].fromUserId).toBe(userA.id);
        expect(pendingRequests[0].toUserId).toBe(userB.id);
      });
    });

    describe('2. Duplicate Request Handling', () => {
      it('user sends multiple requests to the same user - only one pending request exists', async () => {
        // Create initial request via repository
        friendshipRepo.createRequest(userA.id, userB.id);

        // Attempt to send duplicate request via controller
        const req = createMockRequest({
          params: { userId: userA.id },
          body: { friendId: userB.id },
          user: { userId: userA.id },
        });
        const res = createMockResponse();
        await friendshipController.addFriend(req, res);

        expect(res._status).toBe(400);

        // Verify only one request exists in repository
        const pendingRequests = friendshipRepo.getPendingRequests(userB.id);
        expect(pendingRequests).toHaveLength(1);
      });
    });

    describe('3. Accepting a Request', () => {
      it('recipient accepts a pending request', async () => {
        // Create request via repository
        friendshipRepo.createRequest(userA.id, userB.id);

        // Accept request via controller
        const req = createMockRequest({
          params: { userId: userB.id },
          body: { friendId: userA.id },
          user: { userId: userB.id },
        });
        const res = createMockResponse();
        await friendshipController.acceptFriend(req, res);

        // Verify friendship is established in repository
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(true);

        // Verify request is removed from repository
        const pendingRequests = friendshipRepo.getPendingRequests(userB.id);
        expect(pendingRequests).toHaveLength(0);
      });
    });

    describe('4. Rejecting a Request', () => {
      it('recipient rejects a pending request', async () => {
        // Create request via repository
        friendshipRepo.createRequest(userA.id, userB.id);

        // Reject request via controller
        const req = createMockRequest({
          params: { userId: userB.id },
          body: { friendId: userA.id },
          user: { userId: userB.id },
        });
        const res = createMockResponse();
        await friendshipController.rejectFriend(req, res);
        expect(res._status).toBe(200);

        // Verify no friendship was established in repository
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(false);

        // Verify no pending requests remain in repository
        const pendingRequests = friendshipRepo.getPendingRequests(userB.id);
        expect(pendingRequests).toHaveLength(0);
      });
    });

    describe('6. Authorization Rules', () => {
      it('user tries to accept/reject a request not addressed to them', async () => {
        // Create request via repository (userA sends request to userB)
        friendshipRepo.createRequest(userA.id, userB.id);

        // userC (not the recipient) tries to accept the request via controller
        const req1 = createMockRequest({
          params: { userId: userC.id },
          body: { friendId: userA.id },
          user: { userId: userC.id },
        });
        const res1 = createMockResponse();
        await friendshipController.acceptFriend(req1, res1);
        
        // Should return 400 error
        expect(res1._status).toBe(400);

        // Verify friendship not established in repository
        expect(friendshipRepo.areFriends(userA.id, userC.id)).toBe(false);

        // userC tries to reject via controller
        const req2 = createMockRequest({
          params: { userId: userC.id },
          body: { friendId: userA.id },
          user: { userId: userC.id },
        });
        const res2 = createMockResponse();
        await friendshipController.rejectFriend(req2, res2);
        expect(res2._status).toBe(400);
      });
    });

    describe('7. State Transitions', () => {
      it('request moves from pending → accepted; friendship state updates accordingly', async () => {
        // Initial state: no friendship
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(false);

        // Create request via repository
        friendshipRepo.createRequest(userA.id, userB.id);
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(false);

        // Transition: accept request via controller
        const req = createMockRequest({
          params: { userId: userB.id },
          body: { friendId: userA.id },
          user: { userId: userB.id },
        });
        const res = createMockResponse();
        await friendshipController.acceptFriend(req, res);
        
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(true);
        expect(friendshipRepo.getFriendCount(userA.id)).toBe(1);
      });

      it('request moves from pending → rejected; no friendship established', async () => {
        // Create request via repository
        friendshipRepo.createRequest(userA.id, userB.id);

        // Transition: reject request via controller
        const req = createMockRequest({
          params: { userId: userB.id },
          body: { friendId: userA.id },
          user: { userId: userB.id },
        });
        const res = createMockResponse();
        await friendshipController.rejectFriend(req, res);
        
        expect(friendshipRepo.areFriends(userA.id, userB.id)).toBe(false);
        expect(friendshipRepo.getFriendCount(userA.id)).toBe(0);
      });

      it('state transitions are atomic and consistent across multiple operations', async () => {
        // Create multiple requests via repository
        friendshipRepo.createRequest(userA.id, userD.id);
        friendshipRepo.createRequest(userB.id, userD.id);
        friendshipRepo.createRequest(userC.id, userD.id);

        // Accept one request via controller
        const req1 = createMockRequest({
          params: { userId: userD.id },
          body: { friendId: userA.id },
          user: { userId: userD.id },
        });
        const res1 = createMockResponse();
        await friendshipController.acceptFriend(req1, res1);

        // Reject another request via controller
        const req2 = createMockRequest({
          params: { userId: userD.id },
          body: { friendId: userB.id },
          user: { userId: userD.id },
        });
        const res2 = createMockResponse();
        await friendshipController.rejectFriend(req2, res2);

        expect(friendshipRepo.areFriends(userA.id, userD.id)).toBe(true);
        expect(friendshipRepo.areFriends(userB.id, userD.id)).toBe(false);
      });
    });
  });
});
