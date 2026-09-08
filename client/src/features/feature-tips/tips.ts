import type { TranslationKeys } from '../../global/i18n/translations';

// מאגר הטיפים ל"ידעת ש...?" - פיצ'רים שקל לפספס. כל טיפ: אמוג'י, גרדיאנט
// hero ייחודי, וצל תואם. הסדר כאן = סדר ההצגה בקרוסלה (ראו FeatureTipsPopup) -
// מקובץ בקירוב לפי נושא: תוכן מוצר → סידור → יכולות חכמות → שיתוף → ניהול.
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
    id: 'product-photo',
    emoji: '🖼️',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    glowColor: 'rgba(99,102,241,0.45)',
    titleKey: 'tipProductPhotoTitle',
    bodyKey: 'tipProductPhotoBody',
  },
  {
    id: 'product-note',
    emoji: '📝',
    gradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    glowColor: 'rgba(251,146,60,0.45)',
    titleKey: 'tipProductNoteTitle',
    bodyKey: 'tipProductNoteBody',
  },
  {
    id: 'scan-list',
    emoji: '📸',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    glowColor: 'rgba(20,184,166,0.45)',
    titleKey: 'tipScanListTitle',
    bodyKey: 'tipScanListBody',
  },
  {
    id: 'product-reorder',
    emoji: '↕️',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    glowColor: 'rgba(14,165,233,0.45)',
    titleKey: 'tipProductReorderTitle',
    bodyKey: 'tipProductReorderBody',
  },
  {
    id: 'list-reorder',
    emoji: '📚',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    glowColor: 'rgba(245,158,11,0.45)',
    titleKey: 'tipListReorderTitle',
    bodyKey: 'tipListReorderBody',
  },
  {
    id: 'ai-assistant',
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)',
    glowColor: 'rgba(192,132,252,0.45)',
    titleKey: 'tipAiAssistantTitle',
    bodyKey: 'tipAiAssistantBody',
  },
  {
    id: 'price-comparison',
    emoji: '🏷️',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    glowColor: 'rgba(16,185,129,0.45)',
    titleKey: 'tipPriceComparisonTitle',
    bodyKey: 'tipPriceComparisonBody',
  },
  {
    id: 'share-whatsapp',
    emoji: '💬',
    gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
    glowColor: 'rgba(37,211,102,0.45)',
    titleKey: 'tipShareWhatsappTitle',
    bodyKey: 'tipShareWhatsappBody',
  },
  {
    id: 'share-pdf',
    emoji: '📄',
    gradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
    glowColor: 'rgba(248,113,113,0.45)',
    titleKey: 'tipSharePdfTitle',
    bodyKey: 'tipSharePdfBody',
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
    id: 'mute-list',
    emoji: '🔕',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    glowColor: 'rgba(100,116,139,0.4)',
    titleKey: 'tipMuteListTitle',
    bodyKey: 'tipMuteListBody',
  },
];
