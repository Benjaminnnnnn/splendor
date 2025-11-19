import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  createNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, type, title, message, data } = req.body;

      if (!userId || !type || !title || !message) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const notification = await this.notificationService.createNotification({
        userId,
        type,
        title,
        message,
        data,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };

  getUserNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const includeRead = req.query.includeRead === 'true';

      const notifications = await this.notificationService.getUserNotifications(userId, includeRead);
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      await this.notificationService.markAsRead(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      await this.notificationService.markAllAsRead(userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const count = await this.notificationService.getUnreadCount(userId);
      res.status(200).json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;
      await this.notificationService.deleteNotification(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const preferences = await this.notificationService.getNotificationPreferences(userId);
      res.status(200).json(preferences);
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  };

  updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      const updated = await this.notificationService.updateNotificationPreferences(userId, preferences);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
