import { env, logger } from '../config';

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

export type UserRole = 'owner' | 'admin' | 'member' | null;

/**
 * Service for making API calls to the main API server
 * Used primarily for persisting notifications and authorization checks
 */
export class ApiService {
  private static baseUrl = env.API_URL;

  /**
   * Verify that a user is a member of a list by calling the API.
   * Returns true if the user has access (owner or member), false otherwise.
   */
  static async verifyMembership(
    listId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/lists/${listId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      logger.error('verifyMembership failed:', error);
      return false;
    }
  }

  /**
   * Check user's role in a list (owner/admin/member).
   * Returns the role or null if user has no access.
   */
  static async checkRole(
    listId: string,
    userId: string,
    accessToken: string
  ): Promise<UserRole> {
    try {
      const response = await fetch(`${this.baseUrl}/lists/${listId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) return null;

      const body = (await response.json()) as { data?: { owner?: { _id?: string } | string; members?: Array<{ user?: { _id?: string } | string; isAdmin?: boolean }> } };
      const list = body.data;
      if (!list) return null;

      // Check owner (populated or raw ObjectId)
      const owner = list.owner;
      const ownerId = typeof owner === 'object' ? owner?._id : owner;
      if (ownerId?.toString() === userId) return 'owner';

      // Check members
      const member = list.members?.find((m) => {
        const memberUser = m.user;
        const memberId = typeof memberUser === 'object' ? memberUser?._id : memberUser;
        return memberId?.toString() === userId;
      });
      if (member?.isAdmin) return 'admin';
      if (member) return 'member';

      return null;
    } catch (error) {
      logger.error('checkRole failed:', error);
      return null;
    }
  }

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
        logger.error('Failed to broadcast notification:', error);
      }
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
      // Don't throw - notification persistence failure shouldn't break real-time events
    }
  }
}
