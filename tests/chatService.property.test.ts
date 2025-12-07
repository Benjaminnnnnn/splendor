import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ChatService } from '../server/src/services/chatService';
import { FriendshipService } from '../server/src/services/friendshipService';
import { SocketManager } from '../server/src/domain/SocketManager';
import { InMemoryChatRepository } from '../server/src/domain/InMemoryChatRepository';
import { InMemoryFriendshipRepository } from '../server/src/domain/InMemoryFriendshipRepository';
import { MessageType, ChatMessage } from '../shared/types/chat';

describe('Chat Service property tests', () => {
  it('Message History Symmetry: both participants see the same conversation', async () => {
    const userIdArb = fc.tuple(fc.constant('userA'), fc.constant('userB'));
    const messageCountArb = fc.integer({ min: 1, max: 20 });

    await fc.assert(
      fc.asyncProperty(userIdArb, messageCountArb, async ([userA, userB], messageCount) => {
        const chatRepo = new InMemoryChatRepository();
        const friendRepo = new InMemoryFriendshipRepository();
        const socketManager = new SocketManager();
        
        // Make them friends first
        friendRepo.createFriendship(userA, userB);
        
        const friendService = new FriendshipService(friendRepo);
        const chatService = new ChatService(chatRepo, socketManager, friendService);

        // Generate random conversation
        for (let i = 0; i < messageCount; i++) {
          const sender = i % 2 === 0 ? userA : userB;
          const recipient = i % 2 === 0 ? userB : userA;
          const content = `Message ${i}`;
          
          chatService.createDirectMessage(sender, `sender-${sender}`, recipient, content);
        }

        // Fetch history from both perspectives
        const historyFromA = chatRepo.getDirectMessageHistory(userA, userB);
        const historyFromB = chatRepo.getDirectMessageHistory(userB, userA);

        // Both should see the same messages
        expect(historyFromA.length).toBe(historyFromB.length);
        expect(historyFromA.length).toBe(messageCount);

        // Deep compare message IDs and content
        const idsFromA = historyFromA.map((m: ChatMessage) => m.id);
        const idsFromB = historyFromB.map((m: ChatMessage) => m.id);
        expect(new Set(idsFromA)).toEqual(new Set(idsFromB));

        // Verify content matches
        for (let i = 0; i < historyFromA.length; i++) {
          expect(historyFromA[i].content).toBe(historyFromB[i].content);
          expect(historyFromA[i].id).toBe(historyFromB[i].id);
        }
      }),
      { numRuns: 30 }
    );
  });

  it('Chronological Consistency: message timestamps are monotonically non-decreasing', async () => {
    const messageCountArb = fc.integer({ min: 2, max: 25 });

    await fc.assert(
      fc.asyncProperty(messageCountArb, async (messageCount) => {
        const chatRepo = new InMemoryChatRepository();
        const friendRepo = new InMemoryFriendshipRepository();
        const socketManager = new SocketManager();
        
        const userA = 'userA';
        const userB = 'userB';
        
        // Make them friends
        friendRepo.createFriendship(userA, userB);
        
        const friendService = new FriendshipService(friendRepo);
        const chatService = new ChatService(chatRepo, socketManager, friendService);

        // Send messages with small random delays
        const timestamps: Date[] = [];
        for (let i = 0; i < messageCount; i++) {
          const sender = i % 2 === 0 ? userA : userB;
          const recipient = i % 2 === 0 ? userB : userA;
          
          const message = chatService.createDirectMessage(
            sender,
            `sender-${sender}`,
            recipient,
            `Message ${i}`
          );
          
          timestamps.push(message.timestamp);
          
          // Small delay between messages (simulated)
          await new Promise((resolve) => setTimeout(resolve, 1));
        }

        // Retrieve history
        const history = chatRepo.getDirectMessageHistory(userA, userB);

        // Verify timestamps are monotonically non-decreasing
        for (let i = 0; i < history.length - 1; i++) {
          const currentTime = history[i].timestamp.getTime();
          const nextTime = history[i + 1].timestamp.getTime();
          
          expect(currentTime).toBeLessThanOrEqual(nextTime);
        }
      }),
      { numRuns: 30 }
    );
  });

  it('Friends-Only Gatekeeper: DM only succeeds when users are friends', async () => {
    const areFriendsArb = fc.boolean();

    await fc.assert(
      fc.asyncProperty(areFriendsArb, async (areFriends) => {
        const chatRepo = new InMemoryChatRepository();
        const friendRepo = new InMemoryFriendshipRepository();
        const socketManager = new SocketManager();
        
        const userA = 'userA';
        const userB = 'userB';
        
        // Conditionally create friendship
        if (areFriends) {
          friendRepo.createFriendship(userA, userB);
        }
        
        const friendService = new FriendshipService(friendRepo);
        const chatService = new ChatService(chatRepo, socketManager, friendService);

        // Attempt to send message
        if (areFriends) {
          // Should succeed
          const message = chatService.createDirectMessage(userA, 'userA-name', userB, 'Hello');
          expect(message.id).toBeDefined();
          expect(message.content).toBe('Hello');
        } else {
          // Should throw
          expect(() => {
            chatService.createDirectMessage(userA, 'userA-name', userB, 'Hello');
          }).toThrow('Can only send messages to friends');
        }
      }),
      { numRuns: 20 }
    );
  });

  it('Message properties are preserved: content and metadata remain unchanged', async () => {
    const contentArb = fc.string({ minLength: 1, maxLength: 200 });

    await fc.assert(
      fc.asyncProperty(contentArb, async (content) => {
        const chatRepo = new InMemoryChatRepository();
        const friendRepo = new InMemoryFriendshipRepository();
        const socketManager = new SocketManager();
        
        const userA = 'userA';
        const userB = 'userB';
        const senderName = 'Alice';
        
        friendRepo.createFriendship(userA, userB);
        
        const friendService = new FriendshipService(friendRepo);
        const chatService = new ChatService(chatRepo, socketManager, friendService);

        // Create message
        const message = chatService.createDirectMessage(userA, senderName, userB, content);

        // Verify all properties
        expect(message.id).toBeDefined();
        expect(message.type).toBe(MessageType.DIRECT);
        expect(message.senderId).toBe(userA);
        expect(message.senderName).toBe(senderName);
        expect(message.recipientId).toBe(userB);
        expect(message.content).toBe(content);
        expect(message.timestamp).toBeInstanceOf(Date);

        // Retrieve and verify persistence
        const history = chatRepo.getDirectMessageHistory(userA, userB);
        expect(history.length).toBe(1);
        expect(history[0].content).toBe(content);
        expect(history[0].id).toBe(message.id);
      }),
      { numRuns: 40 }
    );
  });
});
