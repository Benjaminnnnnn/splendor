import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../infrastructure/database';
import { EmailProvider } from '../infrastructure/emailProvider';

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

export class NotificationService {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const notificationId = uuidv4();
    const now = Date.now();

    // Get user preferences
    const preferences = await this.getNotificationPreferences(request.userId);

    // Check if user wants this type of notification
    const shouldNotify = this.shouldSendNotification(request.type, preferences);
    
    if (!shouldNotify) {
      throw new Error('User has disabled this notification type');
    }

    const dataJson = request.data ? JSON.stringify(request.data) : null;

    this.db.run(
      `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [notificationId, request.userId, request.type, request.title, request.message, dataJson, 0, now]
    );

    if (preferences.emailEnabled) {
      await this.sendEmailNotification(request);
    }

    return {
      id: notificationId,
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      data: request.data,
      isRead: false,
      createdAt: new Date(now),
    };
  }

  private async sendEmailNotification(request: CreateNotificationRequest): Promise<void> {
    // Get user email
    const user = this.db.get('SELECT email FROM users WHERE id = ?', [request.userId]);
    
    if (!user) {
      return;
    }

    await EmailProvider.sendEmail(
      (user as any).email,
      request.title,
      request.message
    );
  }

  private shouldSendNotification(type: Notification['type'], preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'game_invite':
        return preferences.gameInvites;
      case 'turn_reminder':
        return preferences.turnReminders;
      default:
        return true;
    }
  }

  async getUserNotifications(userId: string, includeRead: boolean = false): Promise<Notification[]> {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];

    if (!includeRead) {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const rows = this.db.query(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      isRead: row.is_read === 1,
      createdAt: new Date(row.created_at),
    }));
  }

  async markAsRead(notificationId: string): Promise<void> {
    this.db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    this.db.run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = this.db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return (result as any).count;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.db.run('DELETE FROM notifications WHERE id = ?', [notificationId]);
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const row = this.db.get(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [userId]
    );

    if (!row) {
      // Create default preferences if they don't exist
      this.db.run(
        'INSERT INTO notification_preferences (user_id) VALUES (?)',
        [userId]
      );

      return {
        userId,
        emailEnabled: true,
        pushEnabled: true,
        gameInvites: true,
        turnReminders: true,
      };
    }

    return {
      userId: (row as any).user_id,
      emailEnabled: (row as any).email_enabled === 1,
      pushEnabled: (row as any).push_enabled === 1,
      gameInvites: (row as any).game_invites === 1,
      turnReminders: (row as any).turn_reminders === 1,
    };
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'userId'>>
  ): Promise<NotificationPreferences> {
    const current = await this.getNotificationPreferences(userId);

    const updated = {
      ...current,
      ...preferences,
    };

    this.db.run(
      `UPDATE notification_preferences SET 
        email_enabled = ?,
        push_enabled = ?,
        game_invites = ?,
        turn_reminders = ?
       WHERE user_id = ?`,
      [
        updated.emailEnabled ? 1 : 0,
        updated.pushEnabled ? 1 : 0,
        updated.gameInvites ? 1 : 0,
        updated.turnReminders ? 1 : 0,
        userId,
      ]
    );

    return updated;
  }

  async notifyGameInvite(userId: string, inviterName: string, lobbyId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'game_invite',
      title: 'Game Invitation',
      message: `${inviterName} invited you to play Splendor!`,
      data: { lobbyId, inviterName },
    });
  }

  async notifyTurnReminder(userId: string, gameId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'turn_reminder',
      title: "It's Your Turn!",
      message: "Don't keep your opponents waiting!",
      data: { gameId },
    });
  }

  async notifyGameStarted(userId: string, gameId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'game_started',
      title: 'Game Started',
      message: 'Your game has started!',
      data: { gameId },
    });
  }

  async notifyGameEnded(userId: string, gameId: string, won: boolean): Promise<void> {
    await this.createNotification({
      userId,
      type: 'game_ended',
      title: won ? 'Victory!' : 'Game Over',
      message: won ? 'Congratulations, you won!' : 'Better luck next time!',
      data: { gameId, won },
    });
  }
}
