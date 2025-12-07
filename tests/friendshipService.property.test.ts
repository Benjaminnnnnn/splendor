import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { FriendshipService } from '../server/src/services/friendshipService';
import { InMemoryFriendshipRepository } from '../server/src/domain/InMemoryFriendshipRepository';

describe('Friendship Service property tests', () => {
  it('Friendship Symmetry Invariant: areFriends(A, B) equals areFriends(B, A)', async () => {
    const userPairsArb = fc.array(
      fc.tuple(
        fc.stringMatching(/^user-[0-9]+$/),
        fc.stringMatching(/^user-[0-9]+$/)
      ),
      { minLength: 1, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(userPairsArb, async (userPairs) => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);

        // Create some friendships
        for (const [userA, userB] of userPairs) {
          if (userA !== userB && !repo.areFriends(userA, userB)) {
            try {
              service.sendFriendRequest(userA, userB);
              service.acceptFriendRequest(userA, userB);
            } catch {
              // Ignore errors from invalid operations
            }
          }
        }

        // Check symmetry for all pairs
        for (const [userA, userB] of userPairs) {
          const areFriendsAB = service.areFriends(userA, userB);
          const areFriendsBA = service.areFriends(userB, userA);
          
          expect(areFriendsAB).toBe(areFriendsBA);
        }
      }),
      { numRuns: 30 }
    );
  });

  it('No Self-Friendship Invariant: cannot friend yourself', async () => {
    const userIdArb = fc.string({ minLength: 1, maxLength: 20 });

    await fc.assert(
      fc.asyncProperty(userIdArb, async (userId) => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);

        // Attempting to send friend request to self should throw
        expect(() => {
          service.sendFriendRequest(userId, userId);
        }).toThrow('Cannot send friend request to yourself');

        // areFriends(user, user) should be false
        expect(service.areFriends(userId, userId)).toBe(false);
      }),
      { numRuns: 20 }
    );
  });

  it('Friend Count Consistency: count matches actual friend list length', async () => {
    const friendCountArb = fc.integer({ min: 0, max: 15 });

    await fc.assert(
      fc.asyncProperty(friendCountArb, async (targetFriendCount) => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const mainUser = 'user-main';

        // Create friendships
        for (let i = 0; i < targetFriendCount; i++) {
          const friendId = `friend-${i}`;
          service.sendFriendRequest(mainUser, friendId);
          service.acceptFriendRequest(mainUser, friendId);
        }

        // Verify count matches list length
        const friendIds = service.getFriendIds(mainUser);
        const friendCount = service.getFriendCount(mainUser);

        expect(friendCount).toBe(friendIds.length);
        expect(friendIds.length).toBe(targetFriendCount);
      }),
      { numRuns: 30 }
    );
  });

  it('Request Lifecycle Consistency: friendship transitions are valid', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const userA = 'userA';
        const userB = 'userB';

        // Initially not friends
        expect(service.areFriends(userA, userB)).toBe(false);

        // Send request
        service.sendFriendRequest(userA, userB);
        
        // Should appear in pending requests
        const pending = service.getPendingRequests(userB);
        expect(pending.some((r) => r.fromUserId === userA && r.toUserId === userB)).toBe(true);
        
        // Still not friends
        expect(service.areFriends(userA, userB)).toBe(false);

        // Accept request
        service.acceptFriendRequest(userA, userB);
        
        // Now friends
        expect(service.areFriends(userA, userB)).toBe(true);
        
        // Request should be gone
        const pendingAfter = service.getPendingRequests(userB);
        expect(pendingAfter.some((r) => r.fromUserId === userA && r.toUserId === userB)).toBe(false);
      }),
      { numRuns: 20 }
    );
  });

  it('Duplicate Request Prevention: cannot send multiple requests to same user', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const userA = 'userA';
        const userB = 'userB';

        // First request succeeds
        service.sendFriendRequest(userA, userB);

        // Second request should fail
        expect(() => {
          service.sendFriendRequest(userA, userB);
        }).toThrow('Friend request already sent');
      }),
      { numRuns: 20 }
    );
  });

  it('Bidirectional Request Prevention: reverse request blocks new request', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const userA = 'userA';
        const userB = 'userB';

        // B sends request to A
        service.sendFriendRequest(userB, userA);

        // A trying to send request to B should fail
        expect(() => {
          service.sendFriendRequest(userA, userB);
        }).toThrow('Friend request from this user already exists');
      }),
      { numRuns: 20 }
    );
  });

  it('Friendship Removal: removing friendship updates both state and count', async () => {
    const initialFriendsArb = fc.integer({ min: 2, max: 10 });

    await fc.assert(
      fc.asyncProperty(initialFriendsArb, async (initialFriends) => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const mainUser = 'user-main';

        // Create friendships
        const friendIds: string[] = [];
        for (let i = 0; i < initialFriends; i++) {
          const friendId = `friend-${i}`;
          friendIds.push(friendId);
          service.sendFriendRequest(mainUser, friendId);
          service.acceptFriendRequest(mainUser, friendId);
        }

        const initialCount = service.getFriendCount(mainUser);
        expect(initialCount).toBe(initialFriends);

        // Remove a friendship
        const friendToRemove = friendIds[0];
        service.removeFriendship(mainUser, friendToRemove);

        // Verify removal
        expect(service.areFriends(mainUser, friendToRemove)).toBe(false);
        expect(service.getFriendCount(mainUser)).toBe(initialFriends - 1);

        const remainingFriends = service.getFriendIds(mainUser);
        expect(remainingFriends).not.toContain(friendToRemove);
        expect(remainingFriends.length).toBe(initialFriends - 1);
      }),
      { numRuns: 30 }
    );
  });

  it('Request Rejection: rejecting a request does not create friendship', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const userA = 'userA';
        const userB = 'userB';

        // Send request
        service.sendFriendRequest(userA, userB);

        // Reject it
        service.rejectFriendRequest(userA, userB);

        // Should not be friends
        expect(service.areFriends(userA, userB)).toBe(false);

        // Request should be gone
        const pending = service.getPendingRequests(userB);
        expect(pending.some((r) => r.fromUserId === userA)).toBe(false);

        // Should be able to send new request now
        expect(() => {
          service.sendFriendRequest(userA, userB);
        }).not.toThrow();
      }),
      { numRuns: 20 }
    );
  });

  it('Friend List Uniqueness: no duplicate friend IDs', async () => {
    const operationsArb = fc.array(
      fc.oneof(
        fc.constant({ type: 'add' as const }),
        fc.constant({ type: 'remove' as const })
      ),
      { minLength: 5, maxLength: 20 }
    );

    await fc.assert(
      fc.asyncProperty(operationsArb, async (operations) => {
        const repo = new InMemoryFriendshipRepository();
        const service = new FriendshipService(repo);
        const mainUser = 'user-main';
        const friendPool = Array.from({ length: 5 }, (_, i) => `friend-${i}`);
        
        let nextFriendIndex = 0;

        for (const op of operations) {
          try {
            if (op.type === 'add' && nextFriendIndex < friendPool.length) {
              const friendId = friendPool[nextFriendIndex];
              if (!service.areFriends(mainUser, friendId)) {
                service.sendFriendRequest(mainUser, friendId);
                service.acceptFriendRequest(mainUser, friendId);
                nextFriendIndex++;
              }
            } else if (op.type === 'remove') {
              const friends = service.getFriendIds(mainUser);
              if (friends.length > 0) {
                service.removeFriendship(mainUser, friends[0]);
              }
            }
          } catch {
            // Ignore errors from invalid operations
          }
        }

        // Check uniqueness
        const friendIds = service.getFriendIds(mainUser);
        const uniqueIds = new Set(friendIds);
        
        expect(friendIds.length).toBe(uniqueIds.size);
      }),
      { numRuns: 30 }
    );
  });
});
