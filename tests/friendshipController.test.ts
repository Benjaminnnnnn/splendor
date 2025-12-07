import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { FriendshipController } from '../server/src/controllers/friendshipController';
import { FriendshipService } from '../server/src/services/friendshipService';
import { UserService } from '../server/src/services/userService';
import { FriendRequest } from '../server/src/domain/FriendshipRepository';

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

interface MockUser { id: string; username: string; }

function buildUserService(users: Record<string, MockUser | null>): UserService {
  return {
    getUserById: vi.fn(async (id: string) => users[id] || null)
  } as unknown as UserService;
}

function buildFriendshipService(overrides: Partial<FriendshipService> = {}): FriendshipService {
  const service: Partial<FriendshipService> = {
    getFriendIds: vi.fn(() => []),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    getPendingRequests: vi.fn(() => [] as FriendRequest[]),
    removeFriendship: vi.fn(),
    areFriends: vi.fn(() => false),
    getFriendCount: vi.fn(() => 0),
    ...overrides
  };
  return service as FriendshipService;
}

function makeReq(params: any, body: any = {}, user: any = { userId: params.userId }, appGet?: (k: string)=>any): Request {
  return {
    params,
    body,
    user,
    app: { get: appGet || (()=>undefined) }
  } as unknown as Request;
}

describe('FriendshipController', () => {
  let friendshipService: FriendshipService;
  let userService: UserService;
  let controller: FriendshipController;

  beforeEach(() => {
    friendshipService = buildFriendshipService();
    userService = buildUserService({});
    controller = new FriendshipController(friendshipService, userService);
  });

  describe('getFriends', () => {
    it('authorized user: returns enriched friend list filtering missing users', async () => {
      (friendshipService.getFriendIds as any) = vi.fn(()=> ['u1','u2','u-missing']);
      userService = buildUserService({
        u1: { id: 'u1', username: 'Alice' },
        u2: { id: 'u2', username: 'Bob' },
        'u-missing': null
      });
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' });
      (friendshipService.getFriendIds as any) = vi.fn(()=> ['u1','u2','u-missing']);
      const res = createMockResponse();

      await controller.getFriends(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ friends: [ { id: 'u1', username: 'Alice' }, { id: 'u2', username: 'Bob' } ] });
    });
  });

  describe('addFriend', () => {
    it('authorized: emits friend:request when recipient socket connected', async () => {
      const emitCalls: any[] = [];
      const io = { to: vi.fn((socket: string)=> ({ emit: (event: string, data: any)=> emitCalls.push({ socket, event, data }) })) };
      const chatService = { getUserSocket: vi.fn(()=> 'sock-recipient') };
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      friendshipService = buildFriendshipService();
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' }, { userId: 'owner' }, (k)=> k==='io'? io : k==='chatService'? chatService : undefined);
      const res = createMockResponse();

      await controller.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Friend request sent', friend: { id: 'target', username: 'Target' } });
      expect(emitCalls.length).toBe(1);
      expect(emitCalls[0].event).toBe('friend:request');
      expect(emitCalls[0].socket).toBe('sock-recipient');
    });

    it('authorized: no emit when recipient not connected', async () => {
      const emitCalls: any[] = [];
      const io = { to: vi.fn((socket: string)=> ({ emit: (event: string, data: any)=> emitCalls.push({ socket, event, data }) })) };
      const chatService = { getUserSocket: vi.fn(()=> undefined) };
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      friendshipService = buildFriendshipService();
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' }, { userId: 'owner' }, (k)=> k==='io'? io : k==='chatService'? chatService : undefined);
      const res = createMockResponse();

      await controller.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(emitCalls.length).toBe(0); // no socket emit
    });

    it('error: friendship service throws -> 400', async () => {
      friendshipService = buildFriendshipService({ sendFriendRequest: vi.fn(()=> { throw new Error('Friend request already sent'); }) });
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' });
      const res = createMockResponse();

      await controller.addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Friend request already sent' });
    });
  });

  describe('acceptFriend', () => {
    it('authorized: emits friend:added to both sockets when connected', async () => {
      const emitCalls: any[] = [];
      const io = { to: vi.fn((socket: string)=> ({ emit: (event: string, data: any)=> emitCalls.push({ socket, event, data }) })) };
      const chatService = { getUserSocket: vi.fn((id: string)=> id==='owner'? 'sock-owner' : id==='target'? 'sock-target' : undefined) };
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      friendshipService = buildFriendshipService();
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' }, { userId: 'owner' }, (k)=> k==='io'? io : k==='chatService'? chatService : undefined);
      const res = createMockResponse();

      await controller.acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const addedEvents = emitCalls.filter(c=> c.event==='friend:added');
      expect(addedEvents.length).toBe(2);
      const sockets = addedEvents.map(e=> e.socket).sort();
      expect(sockets).toEqual(['sock-owner','sock-target']);
    });

    it('error: service throws -> 400', async () => {
      friendshipService = buildFriendshipService({ acceptFriendRequest: vi.fn(()=> { throw new Error('Friend request not found'); }) });
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' });
      const res = createMockResponse();

      await controller.acceptFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Friend request not found' });
    });
  });

  describe('rejectFriend', () => {
    it('authorized: emits friend:request-rejected if sender socket exists', async () => {
      const emitCalls: any[] = [];
      const io = { to: vi.fn((socket: string)=> ({ emit: (event: string, data: any)=> emitCalls.push({ socket, event, data }) })) };
      const chatService = { getUserSocket: vi.fn(()=> 'sock-target') };
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      friendshipService = buildFriendshipService();
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' }, { userId: 'owner' }, (k)=> k==='io'? io : k==='chatService'? chatService : undefined);
      const res = createMockResponse();

      await controller.rejectFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const rejectionEvents = emitCalls.filter(c=> c.event==='friend:request-rejected');
      expect(rejectionEvents.length).toBe(1);
      expect(rejectionEvents[0].socket).toBe('sock-target');
    });

    it('authorized: no emit if sender socket missing', async () => {
      const emitCalls: any[] = [];
      const io = { to: vi.fn((socket: string)=> ({ emit: (event: string, data: any)=> emitCalls.push({ socket, event, data }) })) };
      const chatService = { getUserSocket: vi.fn(()=> undefined) };
      userService = buildUserService({ owner: { id: 'owner', username: 'Owner' }, target: { id: 'target', username: 'Target' } });
      friendshipService = buildFriendshipService();
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' }, { friendId: 'target' }, { userId: 'owner' }, (k)=> k==='io'? io : k==='chatService'? chatService : undefined);
      const res = createMockResponse();

      await controller.rejectFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const rejectionEvents = emitCalls.filter(c=> c.event==='friend:request-rejected');
      expect(rejectionEvents.length).toBe(0);
    });
  });

  describe('getPendingRequests', () => {
    it('authorized: returns enriched requests including Unknown for missing users', async () => {
      const now = new Date();
      friendshipService = buildFriendshipService({ getPendingRequests: vi.fn(()=> [
        { fromUserId: 'u1', toUserId: 'owner', createdAt: now },
        { fromUserId: 'u2', toUserId: 'owner', createdAt: new Date(now.getTime()+1000) }
      ]) });
      userService = buildUserService({ u1: { id: 'u1', username: 'Alice' }, u2: null });
      controller = new FriendshipController(friendshipService, userService);

      const req = makeReq({ userId: 'owner' });
      const res = createMockResponse();

      await controller.getPendingRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const payload = (res.json as any).mock.calls[0][0];
      expect(payload.requests.length).toBe(2);
      const usernames = payload.requests.map((r: any)=> r.username).sort();
      expect(usernames).toEqual(['Alice','Unknown']);
    });
  });
});
