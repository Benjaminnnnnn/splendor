import { vi } from 'vitest';
import { ChatMessage, MessageType } from '../../shared/types/chat';
import { IChatRepository } from '../../server/src/domain/ChatRepository';
import { IFriendshipRepository, FriendRequest } from '../../server/src/domain/FriendshipRepository';

export function createMockChatRepository(): { mock: IChatRepository; saved: ChatMessage[]; saveDirectMessage: ReturnType<typeof vi.fn> } {
  const saved: ChatMessage[] = [];
  const saveDirectMessage = vi.fn((message: ChatMessage) => {
    saved.push(message);
    return message;
  });
  const mock: IChatRepository = {
    saveDirectMessage,
    getDirectMessageHistory: vi.fn((u1: string, u2: string, limit: number = 50) => {
      return saved.filter(m => m.type === MessageType.DIRECT &&
        ((m.senderId === u1 && m.recipientId === u2) || (m.senderId === u2 && m.recipientId === u1))).slice(0, limit);
    }),
    clear: vi.fn(() => {
      saved.length = 0;
      saveDirectMessage.mockClear();
    })
  };
  return { mock, saved, saveDirectMessage };
}

export function createMockFriendshipRepository(forceAreFriends: boolean = false): IFriendshipRepository {
  return {
    createRequest: vi.fn(),
    deleteRequest: vi.fn(() => true),
    getRequest: vi.fn(() => null),
    getPendingRequests: vi.fn(() => [] as FriendRequest[]),
    createFriendship: vi.fn(),
    deleteFriendship: vi.fn(() => true),
    getFriends: vi.fn(() => []),
    areFriends: vi.fn(() => forceAreFriends),
    getFriendCount: vi.fn(() => 0),
    clear: vi.fn()
  };
}
