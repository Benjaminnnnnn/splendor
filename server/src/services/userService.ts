import { v4 as uuidv4 } from 'uuid';
import { HashingService } from '../infrastructure/hashingService';
import { EmailProvider } from '../infrastructure/emailProvider';
import { User, UserStats, GameStatsUpdate } from '../../../shared/types/user';
import { SqliteUserRepository, UserRepository } from '../repositories/userRepository';

export class UserService {
  constructor(private readonly repo: UserRepository = new SqliteUserRepository()) {}

  async registerUser(username: string, email: string, password: string): Promise<User> {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const passwordHash = await HashingService.hashPassword(password);
    
    const userId = uuidv4();
    const now = Date.now();

    const user = await this.repo.registerUser({
      id: userId,
      username,
      email,
      passwordHash,
      createdAt: now,
    });

    await EmailProvider.sendWelcomeEmail(email, username);

    return user;
  }

  async loginUser(email: string, password: string): Promise<User> {
    return this.repo.loginUser(email, password);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.repo.getUserById(userId);
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    return this.repo.getUserStats(userId);
  }

  async updateUserStats(userId: string, update: GameStatsUpdate): Promise<UserStats> {
    return this.repo.updateUserStats(userId, update);
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{ user: User; stats: UserStats }>> {
    return this.repo.getLeaderboard(limit);
  }

  async getUserLeaderboardRank(userId: string): Promise<number | null> {
    return this.repo.getUserLeaderboardRank(userId);
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    return this.repo.searchUsers(query, limit);
  }
}
