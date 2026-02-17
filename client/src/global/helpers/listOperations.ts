import type { List, Product } from '../types';
import type { TranslationKeys } from '../i18n/translations';

type TranslateFn = (key: TranslationKeys) => string;

/**
 * Generates a formatted WhatsApp message for inviting members to a group
 */
export const generateInviteMessage = (list: List, t: TranslateFn): string => {
  const lines = [
    `🛒 ${t('joinGroup')} *${list.name}*`,
    ``,
    `${t('groupCode')}: ${list.inviteCode}`,
  ];
  if (list.password) {
    lines.push(`${t('password')}: ${list.password}`);
  }
  lines.push(``, `SmartBasket`);
  return lines.join('\n');
};

/**
 * Generates a formatted WhatsApp message for sharing a shopping list
 */
export const generateShareListMessage = (list: List, t: TranslateFn): string => {
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
    lines.push(`✅ ${t('listCompleted')}`);
  }

  lines.push(``);
  lines.push(`SmartBasket`);

  return lines.join('\n');
};
