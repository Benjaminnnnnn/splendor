import { describe, it, expect, beforeEach } from 'vitest';
import { SocketManager } from '../server/src/domain/SocketManager';

describe('SocketManager', () => {
  let socketManager: SocketManager;

  beforeEach(() => {
    socketManager = new SocketManager();
  });

  describe('Register', () => {
    it('should register a socket for a user', () => {
      const userId = 'user1';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });

    it('should update socket mapping when same user registers new socket', () => {
      const userId = 'user1';
      const oldSocketId = 'socket123';
      const newSocketId = 'socket456';

      socketManager.registerUserSocket(userId, oldSocketId);
      expect(socketManager.getUserSocket(userId)).toBe(oldSocketId);

      socketManager.registerUserSocket(userId, newSocketId);
      expect(socketManager.getUserSocket(userId)).toBe(newSocketId);
    });

    it('should allow multiple users with different sockets', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const socket1 = 'socket123';
      const socket2 = 'socket456';

      socketManager.registerUserSocket(user1, socket1);
      socketManager.registerUserSocket(user2, socket2);

      expect(socketManager.getUserSocket(user1)).toBe(socket1);
      expect(socketManager.getUserSocket(user2)).toBe(socket2);
    });
  });

  describe('Get', () => {
    it('should return socket ID for registered user', () => {
      const userId = 'user1';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });

    it('should return undefined for unregistered user', () => {
      expect(socketManager.getUserSocket('nonexistent')).toBeUndefined();
    });

    it('should return undefined after user is unregistered', () => {
      const userId = 'user1';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);
      socketManager.unregisterUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBeUndefined();
    });
  });

  describe('Unregister', () => {
    it('should remove socket when socketId matches registered socket', () => {
      const userId = 'user1';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);
      socketManager.unregisterUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBeUndefined();
    });

    it('should NOT remove socket when socketId does not match registered socket', () => {
      const userId = 'user1';
      const registeredSocketId = 'socket123';
      const wrongSocketId = 'socket456';

      socketManager.registerUserSocket(userId, registeredSocketId);
      socketManager.unregisterUserSocket(userId, wrongSocketId);

      expect(socketManager.getUserSocket(userId)).toBe(registeredSocketId);
    });

    it('should be unaffected when trying to unregister non-existent user', () => {
      const userId = 'user1';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);
      socketManager.unregisterUserSocket('nonexistent', 'socket999');

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });

    it('should handle unregistering when user has no socket', () => {
      expect(() => {
        socketManager.unregisterUserSocket('nonexistent', 'socket123');
      }).not.toThrow();
    });

    it('should only remove specific user when multiple users registered', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const socket1 = 'socket123';
      const socket2 = 'socket456';

      socketManager.registerUserSocket(user1, socket1);
      socketManager.registerUserSocket(user2, socket2);

      socketManager.unregisterUserSocket(user1, socket1);

      expect(socketManager.getUserSocket(user1)).toBeUndefined();
      expect(socketManager.getUserSocket(user2)).toBe(socket2);
    });
  });

  describe('Clear', () => {
    it('should remove all socket mappings', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      const user3 = 'user3';
      const socket1 = 'socket123';
      const socket2 = 'socket456';
      const socket3 = 'socket789';

      socketManager.registerUserSocket(user1, socket1);
      socketManager.registerUserSocket(user2, socket2);
      socketManager.registerUserSocket(user3, socket3);

      socketManager.clear();

      expect(socketManager.getUserSocket(user1)).toBeUndefined();
      expect(socketManager.getUserSocket(user2)).toBeUndefined();
      expect(socketManager.getUserSocket(user3)).toBeUndefined();
    });

    it('should allow registering after clear', () => {
      const userId = 'user1';
      const oldSocketId = 'socket123';
      const newSocketId = 'socket456';

      socketManager.registerUserSocket(userId, oldSocketId);
      socketManager.clear();
      socketManager.registerUserSocket(userId, newSocketId);

      expect(socketManager.getUserSocket(userId)).toBe(newSocketId);
    });

    it('should work on empty manager', () => {
      expect(() => {
        socketManager.clear();
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string user IDs', () => {
      const userId = '';
      const socketId = 'socket123';

      socketManager.registerUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });

    it('should handle empty string socket IDs', () => {
      const userId = 'user1';
      const socketId = '';

      socketManager.registerUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });

    it('should handle special characters in IDs', () => {
      const userId = 'user@#$%';
      const socketId = 'socket!@#';

      socketManager.registerUserSocket(userId, socketId);

      expect(socketManager.getUserSocket(userId)).toBe(socketId);
    });
  });
});
