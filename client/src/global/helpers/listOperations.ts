import type { List, Product } from '../types';

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
