import axios from 'axios';
import { ChatMessage, MessageType } from '../../../shared/types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ChatServiceClient {
  /**
   * Fetch direct message history between current user and another user
   */
  async getDirectMessageHistory(userId: string, peerId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await axios.get(`${API_URL}/chat/users/${userId}/conversations/${peerId}`, {
        params: { limit }
      });
      return response.data.messages;
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${API_URL}/chat/users/${userId}/conversations`);
      return response.data.conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }
}

export const chatServiceClient = new ChatServiceClient();
