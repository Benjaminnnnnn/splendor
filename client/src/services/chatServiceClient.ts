import axios, { AxiosInstance } from 'axios';
import { ChatMessage } from '../../../shared/types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Friend {
  id: string;
  username: string;
}

export interface FriendRequest {
  userId: string;
  username: string;
  createdAt: Date;
}

export interface IChatServiceClient {
  getDirectMessageHistory(userId: string, peerId: string, limit?: number): Promise<ChatMessage[]>;
  getFriends(userId: string): Promise<Friend[]>;
  addFriend(userId: string, friendId: string): Promise<Friend>;
  getPendingRequests(userId: string): Promise<FriendRequest[]>;
  acceptFriendRequest(userId: string, friendId: string): Promise<void>;
  rejectFriendRequest(userId: string, friendId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  checkFriendship(userId: string, friendId: string): Promise<boolean>;
  getUserInfo(userId: string): Promise<{ id: string; username: string } | null>;
}

class ChatServiceClient implements IChatServiceClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(http: AxiosInstance = axios, baseUrl: string = API_URL) {
    this.http = http;
    this.baseUrl = baseUrl;
  }
  /**
   * Fetch direct message history between current user and another user
   */
  async getDirectMessageHistory(userId: string, peerId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const response = await this.http.get(`${this.baseUrl}/chat/users/${userId}/conversations/${peerId}`, {
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
      const response = await this.http.get(`${this.baseUrl}/chat/users/${userId}/friends`);
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
      const response = await this.http.post(`${this.baseUrl}/chat/users/${userId}/friends`, { friendId });
      console.log('addFriend: Success response:', response.data);
      return response.data.friend;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  /**
   * Get pending friend requests
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const response = await this.http.get(`${this.baseUrl}/chat/users/${userId}/friends/requests`);
      return response.data.requests;
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, friendId: string): Promise<void> {
    try {
      await this.http.post(`${this.baseUrl}/chat/users/${userId}/friends/accept`, { friendId });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(userId: string, friendId: string): Promise<void> {
    try {
      await this.http.post(`${this.baseUrl}/chat/users/${userId}/friends/reject`, { friendId });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      await this.http.delete(`${this.baseUrl}/chat/users/${userId}/friends/${friendId}`);
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
      const response = await this.http.get(`${this.baseUrl}/chat/users/${userId}/friends/${friendId}/check`);
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
      const response = await this.http.get(`${this.baseUrl}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }
}

export const chatServiceClient = new ChatServiceClient();
