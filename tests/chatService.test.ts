import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChatService } from '../server/src/services/chatService';
import { IChatRepository } from '../server/src/domain/ChatRepository';
import { IFriendshipRepository } from '../server/src/domain/FriendshipRepository';
import { SocketManager } from '../server/src/domain/SocketManager';
import { FriendshipService } from '../server/src/services/friendshipService';
import { ChatMessage, MessageType } from '../shared/types/chat';
import { createMockChatRepository, createMockFriendshipRepository } from './helpers/mocks';

// Factory helpers using vi.fn mocks for dependency injection
// Using shared mocks from tests/helpers/mocks.ts

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChatService', () => {
	const senderId = 'userA';
	const senderName = 'Alice';
	const recipientId = 'userB';
	const recipientName = 'Bob';
	const gameId = 'game-123';

	it('creates a direct message between friends (happy path)', () => {
		const { mock: chatRepo, saved, saveDirectMessage } = createMockChatRepository();
		const socketManager = new SocketManager();
		const friendshipRepo = createMockFriendshipRepository(true);
		const friendshipService = new FriendshipService(friendshipRepo);
		const chatService = new ChatService(chatRepo, socketManager, friendshipService);

		const content = 'Hello Bob!';
		const message = chatService.createDirectMessage(senderId, senderName, recipientId, content);

		expect(message).toBeDefined();
		expect(message.id).toBeTruthy();
		expect(message.timestamp).toBeInstanceOf(Date);
		expect(message.senderId).toBe(senderId);
		expect(saveDirectMessage).toHaveBeenCalledTimes(1);
		expect(saved[0]).toEqual(message);
		// ensure areFriends was queried
		expect(friendshipRepo.areFriends).toHaveBeenCalledWith(senderId, recipientId);
	});

	it('throws when creating a direct message if users are not friends', () => {
		const { mock: chatRepo, saveDirectMessage } = createMockChatRepository();
		const socketManager = new SocketManager();
		const friendshipRepo = createMockFriendshipRepository(false);
		const friendshipService = new FriendshipService(friendshipRepo);
		const chatService = new ChatService(chatRepo, socketManager, friendshipService);

		expect(() => chatService.createDirectMessage(senderId, senderName, recipientId, 'Hi')).toThrow();
		expect(saveDirectMessage).not.toHaveBeenCalled();
		expect(friendshipRepo.areFriends).toHaveBeenCalledWith(senderId, recipientId);
	});

	it('creates a group message without persisting', () => {
		const { mock: chatRepo, saveDirectMessage } = createMockChatRepository();
		const socketManager = new SocketManager();
		const friendshipRepo = createMockFriendshipRepository(true);
		const friendshipService = new FriendshipService(friendshipRepo);
		const chatService = new ChatService(chatRepo, socketManager, friendshipService);

		const content = 'Group hello';
		const message = chatService.createGroupMessage(senderId, senderName, gameId, content);

		expect(message.type).toBe(MessageType.GROUP);
		expect(message.gameId).toBe(gameId);
		expect(message.content).toBe(content);
		expect(saveDirectMessage).not.toHaveBeenCalled();
	});
});
