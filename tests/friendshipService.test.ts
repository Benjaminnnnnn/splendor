import { describe, it, expect, vi, afterEach } from 'vitest';
import { FriendshipService } from '../server/src/services/friendshipService';
import { IFriendshipRepository, FriendRequest } from '../server/src/domain/FriendshipRepository';
import { createMockFriendshipRepository } from './helpers/mocks';

afterEach(() => {
  vi.clearAllMocks();
});

describe('FriendshipService', () => {
  const userA = 'userA';
  const userB = 'userB';

  it('Send friend request: happy path', () => {
    const repo = createMockFriendshipRepository();
    const service = new FriendshipService(repo);

    service.sendFriendRequest(userA, userB);

    expect(repo.createRequest).toHaveBeenCalledWith(userA, userB);
  });

  it('Send friend request: cannot request self', () => {
    const repo = createMockFriendshipRepository();
    const service = new FriendshipService(repo);

    expect(() => service.sendFriendRequest(userA, userA)).toThrow();
    expect(repo.createRequest).not.toHaveBeenCalled();
  });

  it('Send friend request: already friends', () => {
    const repo = createMockFriendshipRepository();
    (repo.areFriends as any) = vi.fn(() => true);
    const service = new FriendshipService(repo);

    expect(() => service.sendFriendRequest(userA, userB)).toThrow();
    expect(repo.createRequest).not.toHaveBeenCalled();
  });

  it('Send friend request: duplicate request', () => {
    const repo = createMockFriendshipRepository();
    const mockRequest: FriendRequest = { fromUserId: userA, toUserId: userB, createdAt: new Date() };
    (repo.getRequest as any) = vi.fn((from: string, to: string) => 
      from === userA && to === userB ? mockRequest : null
    );
    const service = new FriendshipService(repo);

    expect(() => service.sendFriendRequest(userA, userB)).toThrow();
    expect(repo.createRequest).not.toHaveBeenCalled();
  });

  it('Send friend request: reverse request exists', () => {
    const repo = createMockFriendshipRepository();
    const mockRequest: FriendRequest = { fromUserId: userB, toUserId: userA, createdAt: new Date() };
    (repo.getRequest as any) = vi.fn((from: string, to: string) => 
      from === userB && to === userA ? mockRequest : null
    );
    const service = new FriendshipService(repo);

    expect(() => service.sendFriendRequest(userA, userB)).toThrow();
    expect(repo.createRequest).not.toHaveBeenCalled();
  });

  it('Accept friend request: happy path', () => {
    const repo = createMockFriendshipRepository();
    const mockRequest: FriendRequest = { fromUserId: userA, toUserId: userB, createdAt: new Date() };
    (repo.getRequest as any) = vi.fn(() => mockRequest);
    const service = new FriendshipService(repo);

    service.acceptFriendRequest(userA, userB);

    expect(repo.deleteRequest).toHaveBeenCalledWith(userA, userB);
    expect(repo.createFriendship).toHaveBeenCalledWith(userA, userB);
  });

  it('Accept friend request: request not found', () => {
    const repo = createMockFriendshipRepository();
    (repo.getRequest as any) = vi.fn(() => null);
    const service = new FriendshipService(repo);

    expect(() => service.acceptFriendRequest(userA, userB)).toThrow();
    expect(repo.createFriendship).not.toHaveBeenCalled();
  });

  it('Reject friend request: happy path', () => {
    const repo = createMockFriendshipRepository();
    (repo.deleteRequest as any) = vi.fn(() => true);
    const service = new FriendshipService(repo);

    service.rejectFriendRequest(userA, userB);

    expect(repo.deleteRequest).toHaveBeenCalledWith(userA, userB);
  });

  it('Reject friend request: request not found', () => {
    const repo = createMockFriendshipRepository();
    (repo.deleteRequest as any) = vi.fn(() => false);
    const service = new FriendshipService(repo);

    expect(() => service.rejectFriendRequest(userA, userB)).toThrow();
  });

  it('Get pending requests', () => {
    const now = new Date();
    const repo = createMockFriendshipRepository();
    (repo.getPendingRequests as any) = vi.fn((u: string) => [
        { fromUserId: userA, toUserId: userB, createdAt: now },
        { fromUserId: 'userC', toUserId: userB, createdAt: new Date(now.getTime() + 1000) },
    ]);
    const service = new FriendshipService(repo);

    const list = service.getPendingRequests(userB);
    expect(list.length).toBe(2);
    expect(list[0].fromUserId).toBe(userA);
    expect(list[1].fromUserId).toBe('userC');
  });

  it('Remove friendship: happy path', () => {
    const repo = createMockFriendshipRepository();
    (repo.deleteFriendship as any) = vi.fn(() => true);
    const service = new FriendshipService(repo);

    service.removeFriendship(userA, userB);

    expect(repo.deleteFriendship).toHaveBeenCalledWith(userA, userB);
  });

  it('Remove friendship: not found', () => {
    const repo = createMockFriendshipRepository();
    (repo.deleteFriendship as any) = vi.fn(() => false);
    const service = new FriendshipService(repo);

    expect(() => service.removeFriendship(userA, userB)).toThrow();
  });

  it('Get friend IDs and count', () => {
    const repo = createMockFriendshipRepository();
    (repo.getFriends as any) = vi.fn((u: string) => (u === userA ? [userB, 'userC'] : []));
    (repo.getFriendCount as any) = vi.fn((u: string) => (u === userA ? 2 : 0));
    const service = new FriendshipService(repo);

    expect(service.getFriendIds(userA)).toEqual([userB, 'userC']);
    expect(service.getFriendCount(userA)).toBe(2);
  });

  it('Check if users are friends', () => {
    const repo = createMockFriendshipRepository();
    (repo.areFriends as any) = vi.fn((u1: string, u2: string) => 
      (u1 === userA && u2 === userB) || (u1 === userB && u2 === userA)
    );
    const service = new FriendshipService(repo);

    expect(service.areFriends(userA, userB)).toBe(true);
    expect(service.areFriends(userB, userA)).toBe(true);
    expect(service.areFriends(userA, 'userC')).toBe(false);
  });
});
