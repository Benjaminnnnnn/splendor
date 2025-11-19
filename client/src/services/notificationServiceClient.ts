import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'game_invite' | 'turn_reminder' | 'game_started' | 'game_ended' | 'general';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  gameInvites: boolean;
  turnReminders: boolean;
}

export interface CreateNotificationRequest {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: any;
}

class NotificationServiceClient {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/notifications`;
  }

  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const response = await axios.post(this.baseURL, request);
    return response.data;
  }

  async getUserNotifications(userId: string, includeRead: boolean = false): Promise<Notification[]> {
    const response = await axios.get(`${this.baseURL}/user/${userId}`, {
      params: { includeRead },
    });
    return response.data;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await axios.put(`${this.baseURL}/${notificationId}/read`);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await axios.put(`${this.baseURL}/user/${userId}/mark-all-read`);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const response = await axios.get(`${this.baseURL}/user/${userId}/unread-count`);
    return response.data.count;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${notificationId}`);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const response = await axios.get(`${this.baseURL}/user/${userId}/preferences`);
    return response.data;
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'userId'>>
  ): Promise<NotificationPreferences> {
    const response = await axios.put(`${this.baseURL}/user/${userId}/preferences`, preferences);
    return response.data;
  }
}

export const notificationServiceClient = new NotificationServiceClient();
