/**
 * Socket Manager - Manages user socket connections
 * Keeps track of which socket IDs are associated with which users
 */
export class SocketManager {
  // Store user socket mappings: Map<userId, socketId>
  // One socket per user (simplified)
  private userSockets: Map<string, string> = new Map();

  /**
   * Register a socket connection for a user
   */
  registerUserSocket(userId: string, socketId: string): void {
    this.userSockets.set(userId, socketId);
  }

  /**
   * Unregister a socket connection for a user
   */
  unregisterUserSocket(userId: string, socketId: string): void {
    const existingSocketId = this.userSockets.get(userId);
    if (existingSocketId === socketId) {
      this.userSockets.delete(userId);
    }
  }

  /**
   * Get socket ID for a user
   */
  getUserSocket(userId: string): string | undefined {
    return this.userSockets.get(userId);
  }

  /**
   * Clear all socket mappings (useful for testing)
   */
  clear(): void {
    this.userSockets.clear();
  }
}
