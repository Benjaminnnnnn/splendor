import axios from 'axios';
import { ChatMessage } from '../../../shared/types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Friend {
  id: string;
  username: string;
}

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
   * Get all friends for a user
   */
  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const response = await axios.get(`${API_URL}/chat/users/${userId}/friends`);
      return response.data.friends;
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  /**
   * Add a friend
   */
  async addFriend(userId: string, friendId: string): Promise<Friend> {
    try {
      console.log('addFriend: Sending request with userId:', userId, 'friendId:', friendId);
      console.log('addFriend: Token in localStorage:', localStorage.getItem('splendor_token'));
      const response = await axios.post(`${API_URL}/chat/users/${userId}/friends`, { friendId });
      console.log('addFriend: Success response:', response.data);
      return response.data.friend;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      await axios.delete(`${API_URL}/chat/users/${userId}/friends/${friendId}`);
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Check if two users are friends
   */
  async checkFriendship(userId: string, friendId: string): Promise<boolean> {
    try {
      const response = await axios.get(`${API_URL}/chat/users/${userId}/friends/${friendId}/check`);
      return response.data.areFriends;
    } catch (error) {
      console.error('Error checking friendship:', error);
      return false;
    }
  }

  /**
   * Get user info by ID
   */
  async getUserInfo(userId: string): Promise<{ id: string; username: string } | null> {
    try {
      const response = await axios.get(`${API_URL}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }
}

export const chatServiceClient = new ChatServiceClient();
