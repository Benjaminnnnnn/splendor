import axios from 'axios';
import { User, UserStats, GameStatsUpdate } from '../../../shared/types/user';

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

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const response = await axios.get(`${this.baseURL}/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }
}

export const userServiceClient = new UserServiceClient();
