import type { TranslationKeys } from '../../global/i18n/translations';

// מאגר הטיפים ל"ידעת ש...?" - פיצ'רים שקל לפספס. כל טיפ: אמוג'י, גרדיאנט
// hero רך (בהיר/פסטלי באור, "שטיפת" צבע שקופה על כהה - אותה טכניקה בדיוק
// כמו PAPER_NOTE.fillDark), ו"דיו" (טקסט+אייקון) תואם עם קונטרסט טוב על
// הגרדיאנט שלו. הסדר כאן = סדר ההצגה בקרוסלה (ראו FeatureTipsPopup) -
// מקובץ בקירוב לפי נושא: תוכן מוצר → סידור → יכולות חכמות → שיתוף → ניהול.
//
// הגרדיאנטים עברו מרוויים/עזים לפסטליים-רכים (למשל אינדיגו שהיה #6366F1
// מלא נהיה משטח #E0E7FF שקט) - כל טיפ עדיין בגוון משלו להבדלה חזותית בין
// שקופיות, אבל בלי "לצרוח" על המסך. glow (הצל שסביב כל הכרטיס) התרכך
// בהתאם.
export interface FeatureTip {
  id: string;
  emoji: string;
  gradient: { light: string; dark: string }; // רקע ה-hero
  ink: { light: string; dark: string };       // צבע כותרת+אייקון על ה-hero
  glow: { light: string; dark: string };      // צל/זוהר תואם מסביב לכרטיס
  titleKey: TranslationKeys;
  bodyKey: TranslationKeys;
}

export const FEATURE_TIPS: FeatureTip[] = [
  {
    id: 'product-photo',
    emoji: '🖼️',
    gradient: { light: 'linear-gradient(135deg, #E0E7FF 0%, #EEF2FF 100%)', dark: 'linear-gradient(135deg, rgba(99,102,241,0.24) 0%, rgba(99,102,241,0.08) 100%)' },
    ink: { light: '#4338CA', dark: '#A5B4FC' },
    glow: { light: 'rgba(99,102,241,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductPhotoTitle',
    bodyKey: 'tipProductPhotoBody',
  },
  {
    id: 'product-note',
    emoji: '📝',
    gradient: { light: 'linear-gradient(135deg, #FFEDD5 0%, #FFF7ED 100%)', dark: 'linear-gradient(135deg, rgba(251,146,60,0.24) 0%, rgba(251,146,60,0.08) 100%)' },
    ink: { light: '#C2410C', dark: '#FDBA74' },
    glow: { light: 'rgba(251,146,60,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductNoteTitle',
    bodyKey: 'tipProductNoteBody',
  },
  {
    id: 'scan-list',
    emoji: '📸',
    gradient: { light: 'linear-gradient(135deg, #CCFBF1 0%, #F0FDFA 100%)', dark: 'linear-gradient(135deg, rgba(20,184,166,0.24) 0%, rgba(20,184,166,0.08) 100%)' },
    ink: { light: '#0F766E', dark: '#5EEAD4' },
    glow: { light: 'rgba(20,184,166,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipScanListTitle',
    bodyKey: 'tipScanListBody',
  },
  {
    id: 'product-reorder',
    emoji: '↕️',
    gradient: { light: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)', dark: 'linear-gradient(135deg, rgba(14,165,233,0.24) 0%, rgba(14,165,233,0.08) 100%)' },
    ink: { light: '#0369A1', dark: '#7DD3FC' },
    glow: { light: 'rgba(14,165,233,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductReorderTitle',
    bodyKey: 'tipProductReorderBody',
  },
  {
    id: 'list-reorder',
    emoji: '📚',
    gradient: { light: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)', dark: 'linear-gradient(135deg, rgba(245,158,11,0.24) 0%, rgba(245,158,11,0.08) 100%)' },
    ink: { light: '#B45309', dark: '#FCD34D' },
    glow: { light: 'rgba(245,158,11,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipListReorderTitle',
    bodyKey: 'tipListReorderBody',
  },
  {
    id: 'ai-assistant',
    emoji: '✨',
    gradient: { light: 'linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)', dark: 'linear-gradient(135deg, rgba(192,132,252,0.24) 0%, rgba(192,132,252,0.08) 100%)' },
    ink: { light: '#7E22CE', dark: '#D8B4FE' },
    glow: { light: 'rgba(192,132,252,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipAiAssistantTitle',
    bodyKey: 'tipAiAssistantBody',
  },
  {
    id: 'price-comparison',
    emoji: '🏷️',
    gradient: { light: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)', dark: 'linear-gradient(135deg, rgba(16,185,129,0.24) 0%, rgba(16,185,129,0.08) 100%)' },
    ink: { light: '#047857', dark: '#6EE7B7' },
    glow: { light: 'rgba(16,185,129,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipPriceComparisonTitle',
    bodyKey: 'tipPriceComparisonBody',
  },
  {
    id: 'share-whatsapp',
    emoji: '💬',
    gradient: { light: 'linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)', dark: 'linear-gradient(135deg, rgba(37,211,102,0.24) 0%, rgba(37,211,102,0.08) 100%)' },
    ink: { light: '#15803D', dark: '#86EFAC' },
    glow: { light: 'rgba(37,211,102,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipShareWhatsappTitle',
    bodyKey: 'tipShareWhatsappBody',
  },
  {
    id: 'share-pdf',
    emoji: '📄',
    gradient: { light: 'linear-gradient(135deg, #FFE4E6 0%, #FFF1F2 100%)', dark: 'linear-gradient(135deg, rgba(244,63,94,0.22) 0%, rgba(244,63,94,0.07) 100%)' },
    ink: { light: '#BE123C', dark: '#FDA4AF' },
    glow: { light: 'rgba(244,63,94,0.18)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipSharePdfTitle',
    bodyKey: 'tipSharePdfBody',
  },
  {
    id: 'saved-lists',
    emoji: '📋',
    gradient: { light: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)', dark: 'linear-gradient(135deg, rgba(139,92,246,0.24) 0%, rgba(139,92,246,0.08) 100%)' },
    ink: { light: '#6D28D9', dark: '#C4B5FD' },
    glow: { light: 'rgba(139,92,246,0.20)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipSavedListsTitle',
    bodyKey: 'tipSavedListsBody',
  },
  {
    id: 'mute-list',
    emoji: '🔕',
    gradient: { light: 'linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)', dark: 'linear-gradient(135deg, rgba(100,116,139,0.24) 0%, rgba(100,116,139,0.08) 100%)' },
    ink: { light: '#475569', dark: '#CBD5E1' },
    glow: { light: 'rgba(100,116,139,0.16)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipMuteListTitle',
    bodyKey: 'tipMuteListBody',
  },
];
