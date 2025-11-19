import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';

export default function notificationRoutes(): Router {
  const router = Router();
  const notificationController = new NotificationController();

  // Notification management
  router.post('/', notificationController.createNotification);
  router.get('/user/:userId', notificationController.getUserNotifications);
  router.get('/user/:userId/unread-count', notificationController.getUnreadCount);
  router.put('/user/:userId/mark-all-read', notificationController.markAllAsRead);
  router.put('/:notificationId/read', notificationController.markAsRead);
  router.delete('/:notificationId', notificationController.deleteNotification);

  // Notification preferences
  router.get('/user/:userId/preferences', notificationController.getNotificationPreferences);
  router.put('/user/:userId/preferences', notificationController.updateNotificationPreferences);

  return router;
}
