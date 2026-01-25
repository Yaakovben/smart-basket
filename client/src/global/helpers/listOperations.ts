import type { List, User, Member, Notification, Product } from '../types';

/**
 * Creates a new notification object
 */
export const createNotification = (
  type: 'join' | 'leave',
  user: User
): Notification => ({
  id: `n${Date.now()}`,
  type,
  userId: user.id,
  userName: user.name,
  timestamp: new Date().toISOString(),
  read: false
});

/**
 * Creates a member object from user
 */
export const userToMember = (user: User): Member => ({
  id: user.id,
  name: user.name,
  email: user.email
});

/**
 * Adds a member to a list with join notification
 */
export const addMemberToList = (list: List, user: User): List => ({
  ...list,
  members: [...list.members, userToMember(user)],
  notifications: [
    ...(list.notifications || []),
    createNotification('join', user)
  ]
});

/**
 * Removes a member from a list with leave notification
 */
export const removeMemberFromList = (list: List, user: User): List => ({
  ...list,
  members: list.members.filter((m) => m.id !== user.id),
  notifications: [
    ...(list.notifications || []),
    createNotification('leave', user)
  ]
});

/**
 * Marks all notifications in a list as read
 */
export const markListNotificationsRead = (list: List): List => ({
  ...list,
  notifications: (list.notifications || []).map((n) => ({
    ...n,
    read: true
  }))
});

/**
 * Finds a group by invite code
 */
export const findGroupByCode = (
  lists: List[],
  code: string
): List | undefined => {
  return lists.find((l) => l.inviteCode === code && l.isGroup);
};

/**
 * Checks if user is already in a group
 */
export const isUserInGroup = (group: List, userId: string): boolean => {
  return group.owner.id === userId ||
         group.members.some((m) => m.id === userId);
};

/**
 * Join group validation result
 */
export interface JoinGroupResult {
  success: boolean;
  error?: string;
}

/**
 * Validates join group request
 */
export const validateJoinGroup = (
  lists: List[],
  code: string,
  password: string,
  user: User | null
): JoinGroupResult => {
  if (!user) {
    return { success: false, error: 'משתמש לא מחובר' };
  }

  const group = findGroupByCode(lists, code);

  if (!group) {
    return { success: false, error: 'קבוצה לא נמצאה' };
  }

  if (group.password !== password) {
    return { success: false, error: 'סיסמה שגויה' };
  }

  if (isUserInGroup(group, user.id)) {
    return { success: false, error: 'אתה כבר בקבוצה' };
  }

  return { success: true };
};

/**
 * Generates a formatted WhatsApp message for inviting members to a group
 */
export const generateInviteMessage = (list: List): string => {
  const lines = [
    `🛒 הצטרף לקבוצה *${list.name}*`,
    ``,
    `קוד: ${list.inviteCode}`,
    `סיסמה: ${list.password}`,
    ``,
    `SmartBasket`
  ];
  return lines.join('\n');
};

/**
 * Generates a formatted WhatsApp message for sharing a shopping list
 */
export const generateShareListMessage = (list: List): string => {
  const pendingProducts = list.products.filter((p: Product) => !p.isPurchased);

  const lines: string[] = [
    `🛒 *${list.name}*`,
    ``
  ];

  if (pendingProducts.length > 0) {
    pendingProducts.forEach((p: Product) => {
      lines.push(`• ${p.name} - ${p.quantity} ${p.unit}`);
    });
  } else {
    lines.push(`✅ הרשימה הושלמה`);
  }

  lines.push(``);
  lines.push(`SmartBasket`);

  return lines.join('\n');
};
