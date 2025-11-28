import axios from 'axios';
import { User, UserStats, GameStatsUpdate } from '../../../shared/types/user';
import { AchievementCode, AchievementCatalogEntryWithCode } from '../../../shared/data/achievement';

export interface AchievementDto {
  code: AchievementCode | string;
  name: string;
  description: string;
  category: AchievementCatalogEntryWithCode['category'];
  icon?: string;
  unlockType: AchievementCatalogEntryWithCode['unlockType'];
  sortOrder?: number;
  unlockedAt?: number;
  progressValue?: number;
}

export interface AchievementsResponse {
  unlocked: AchievementDto[];
  locked: AchievementDto[];
}

export interface AchievementsEvaluationResult {
  newlyUnlocked: AchievementDto[];
  alreadyUnlocked: string[];
}

export interface UserProfile {
  user: User;
  stats: UserStats;
  achievements: AchievementsResponse;
  leaderboardRank: number | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

class UserServiceClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/users`;
  }

  async register(request: RegisterRequest): Promise<User> {
    const response = await axios.post(`${this.baseURL}/register`, request);
    return response.data;
  }

  async login(request: LoginRequest): Promise<User> {
    const response = await axios.post(`${this.baseURL}/login`, request);
    return response.data;
  }

  async getUserById(userId: string): Promise<User> {
    const response = await axios.get(`${this.baseURL}/${userId}`);
    return response.data;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const response = await axios.get(`${this.baseURL}/${userId}/stats`);
    return response.data;
  }

  async evaluateUserAchievements(userId: string): Promise<AchievementsEvaluationResult> {
    const response = await axios.post(`${this.baseURL}/${userId}/achievements/evaluate`);
    return response.data;
  }

  async updateUserStats(userId: string, update: GameStatsUpdate): Promise<UserStats> {
    const response = await axios.put(`${this.baseURL}/${userId}/stats`, update);
    return response.data;
  }

  async getLeaderboard(limit: number = 10): Promise<Array<{ user: User; stats: UserStats }>> {
    const response = await axios.get(`${this.baseURL}/leaderboard`, {
      params: { limit },
    });
    return response.data;
  }

  async getUserLeaderboardRank(userId: string): Promise<number | null> {
    try {
      const response = await axios.get(`${this.baseURL}/${userId}/leaderboard-rank`);
      return response.data.rank;
    } catch (error) {
      console.error('Failed to get user leaderboard rank:', error);
      return null;
    }
  }

  async getUserAchievements(userId: string): Promise<AchievementsResponse> {
    const response = await axios.get(`${this.baseURL}/${userId}/achievements`);
    return response.data;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    // Ensure achievements are evaluated before fetching profile details so
    // the unlocked list is fresh when the page renders.
    try {
      await this.evaluateUserAchievements(userId);
    } catch (error) {
      console.warn('Failed to evaluate achievements before fetching profile', error);
    }

    const [user, stats, achievements, leaderboardRank] = await Promise.all([
      this.getUserById(userId),
      this.getUserStats(userId),
      this.getUserAchievements(userId),
      this.getUserLeaderboardRank(userId),
    ]);

    return { user, stats, achievements, leaderboardRank };
  }

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const response = await axios.get(`${this.baseURL}/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }
}

export const userServiceClient = new UserServiceClient();
