import { env } from '../config';

type NotificationType =
  | 'join'
  | 'leave'
  | 'product_add'
  | 'product_update'
  | 'product_delete'
  | 'product_purchase'
  | 'member_removed';

interface BroadcastNotificationData {
  listId: string;
  type: NotificationType;
  actorId: string;
  productId?: string;
  productName?: string;
}

/**
 * Service for making API calls to the main API server
 * Used primarily for persisting notifications
 */
export class ApiService {
  private static baseUrl = env.API_URL;

  /**
   * Create notifications for all list members (except the actor)
   * This is used for product events where we want to notify all list members
   */
  static async broadcastNotification(
    data: BroadcastNotificationData,
    accessToken: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to broadcast notification:', error);
      }
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      // Don't throw - notification persistence failure shouldn't break real-time events
    }
  }
}
