import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class AIService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/ai`;
  }

  async getRecommendation(gameId: string, playerId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/${gameId}/recommendation`, {
        params: { playerId }
      });
      return response.data.recommendation;
    } catch (error) {
      console.error('Error fetching AI recommendation:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();
