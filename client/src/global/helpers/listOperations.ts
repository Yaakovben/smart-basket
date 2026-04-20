import type { List, Product } from '../types';
import type { TranslationKeys } from '../i18n/translations';

type TranslateFn = (key: TranslationKeys) => string;

/** יצירת הודעת WhatsApp מעוצבת להזמנת חברים לרשימה */
export const generateInviteMessage = (list: List, _t: TranslateFn): string => {
  const joinUrl = `${window.location.origin}/join?code=${list.inviteCode}&password=${list.password || ''}`;
  const lines = [
    `🛒 הצטרף לרשימת *"${list.name}"*`,
    ``,
    `📋 קוד: *${list.inviteCode}*`,
  ];
  if (list.password) {
    lines.push(`🔑 סיסמה: *${list.password}*`);
  }
  lines.push(
    ``,
    `👇 ${joinUrl}`,
  );
  return lines.join('\n');
};

/** יצירת הודעת WhatsApp מעוצבת לשיתוף רשימת קניות */
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
