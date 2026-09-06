import type { TranslationKeys } from '../../global/i18n/translations';

// מאגר הטיפים ל"ידעת ש...?" - פיצ'רים שקל לפספס. כל טיפ: אמוג'י, גרדיאנט
// hero ייחודי, ומפתחות תרגום לכותרת+גוף. הסדר לא משנה - הבחירה אקראית
// מתוך מה שעדיין לא הוצג (ראו useFeatureTips).
export interface FeatureTip {
  id: string;
  emoji: string;
  gradient: string;      // רקע ה-hero
  glowColor: string;     // צל/זוהר תואם
  titleKey: TranslationKeys;
  bodyKey: TranslationKeys;
}

export const FEATURE_TIPS: FeatureTip[] = [
  {
    id: 'scan-list',
    emoji: '📸',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    glowColor: 'rgba(20,184,166,0.45)',
    titleKey: 'tipScanListTitle',
    bodyKey: 'tipScanListBody',
  },
  {
    id: 'product-photo',
    emoji: '🖼️',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    glowColor: 'rgba(99,102,241,0.45)',
    titleKey: 'tipProductPhotoTitle',
    bodyKey: 'tipProductPhotoBody',
  },
  {
    id: 'share-qr',
    emoji: '📱',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    glowColor: 'rgba(14,165,233,0.45)',
    titleKey: 'tipShareQrTitle',
    bodyKey: 'tipShareQrBody',
  },
  {
    id: 'move-products',
    emoji: '↔️',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    glowColor: 'rgba(245,158,11,0.45)',
    titleKey: 'tipMoveProductsTitle',
    bodyKey: 'tipMoveProductsBody',
  },
  {
    id: 'long-press',
    emoji: '✅',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    glowColor: 'rgba(16,185,129,0.45)',
    titleKey: 'tipLongPressTitle',
    bodyKey: 'tipLongPressBody',
  },
  {
    id: 'swipe',
    emoji: '👈',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    glowColor: 'rgba(236,72,153,0.45)',
    titleKey: 'tipSwipeTitle',
    bodyKey: 'tipSwipeBody',
  },
  {
    id: 'saved-lists',
    emoji: '📋',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    glowColor: 'rgba(139,92,246,0.45)',
    titleKey: 'tipSavedListsTitle',
    bodyKey: 'tipSavedListsBody',
  },
  {
    id: 'insights',
    emoji: '💰',
    gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
    glowColor: 'rgba(13,148,136,0.45)',
    titleKey: 'tipInsightsTitle',
    bodyKey: 'tipInsightsBody',
  },
];
