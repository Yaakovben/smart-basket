import type { TranslationKeys } from '../../global/i18n/translations';

export interface FeatureTip {
  id: string;
  emoji: string;
  gradient: { light: string; dark: string };
  ink: { light: string; dark: string };
  glow: { light: string; dark: string };
  titleKey: TranslationKeys;
  bodyKey: TranslationKeys;
}

export const FEATURE_TIPS: FeatureTip[] = [
  {
    id: 'product-photo',
    emoji: '🖼️',
    gradient: { light: 'linear-gradient(135deg, #818CF8 0%, #C7D2FE 60%, #EEF2FF 100%)', dark: 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0.18) 100%)' },
    ink: { light: '#3730A3', dark: '#A5B4FC' },
    glow: { light: 'rgba(99,102,241,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductPhotoTitle',
    bodyKey: 'tipProductPhotoBody',
  },
  {
    id: 'product-note',
    emoji: '📝',
    gradient: { light: 'linear-gradient(135deg, #FB923C 0%, #FED7AA 60%, #FFF7ED 100%)', dark: 'linear-gradient(135deg, rgba(251,146,60,0.55) 0%, rgba(251,146,60,0.18) 100%)' },
    ink: { light: '#9A3412', dark: '#FDBA74' },
    glow: { light: 'rgba(251,146,60,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductNoteTitle',
    bodyKey: 'tipProductNoteBody',
  },
  {
    id: 'scan-list',
    emoji: '📸',
    gradient: { light: 'linear-gradient(135deg, #14B8A6 0%, #99F6E4 60%, #F0FDFA 100%)', dark: 'linear-gradient(135deg, rgba(20,184,166,0.55) 0%, rgba(20,184,166,0.18) 100%)' },
    ink: { light: '#134E4A', dark: '#5EEAD4' },
    glow: { light: 'rgba(20,184,166,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipScanListTitle',
    bodyKey: 'tipScanListBody',
  },
  {
    id: 'product-reorder',
    emoji: '↕️',
    gradient: { light: 'linear-gradient(135deg, #38BDF8 0%, #BAE6FD 60%, #F0F9FF 100%)', dark: 'linear-gradient(135deg, rgba(56,189,248,0.55) 0%, rgba(56,189,248,0.18) 100%)' },
    ink: { light: '#0C4A6E', dark: '#7DD3FC' },
    glow: { light: 'rgba(56,189,248,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipProductReorderTitle',
    bodyKey: 'tipProductReorderBody',
  },
  {
    id: 'list-reorder',
    emoji: '📚',
    gradient: { light: 'linear-gradient(135deg, #FBBF24 0%, #FDE68A 60%, #FFFBEB 100%)', dark: 'linear-gradient(135deg, rgba(245,158,11,0.55) 0%, rgba(245,158,11,0.18) 100%)' },
    ink: { light: '#78350F', dark: '#FCD34D' },
    glow: { light: 'rgba(245,158,11,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipListReorderTitle',
    bodyKey: 'tipListReorderBody',
  },
  {
    id: 'ai-assistant',
    emoji: '✨',
    gradient: { light: 'linear-gradient(135deg, #C084FC 0%, #E9D5FF 60%, #FAF5FF 100%)', dark: 'linear-gradient(135deg, rgba(192,132,252,0.55) 0%, rgba(192,132,252,0.18) 100%)' },
    ink: { light: '#581C87', dark: '#D8B4FE' },
    glow: { light: 'rgba(192,132,252,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipAiAssistantTitle',
    bodyKey: 'tipAiAssistantBody',
  },
  {
    id: 'price-comparison',
    emoji: '🏷️',
    gradient: { light: 'linear-gradient(135deg, #34D399 0%, #A7F3D0 60%, #ECFDF5 100%)', dark: 'linear-gradient(135deg, rgba(52,211,153,0.55) 0%, rgba(52,211,153,0.18) 100%)' },
    ink: { light: '#064E3B', dark: '#6EE7B7' },
    glow: { light: 'rgba(52,211,153,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipPriceComparisonTitle',
    bodyKey: 'tipPriceComparisonBody',
  },
  {
    id: 'share-whatsapp',
    emoji: '💬',
    gradient: { light: 'linear-gradient(135deg, #4ADE80 0%, #BBF7D0 60%, #F0FDF4 100%)', dark: 'linear-gradient(135deg, rgba(74,222,128,0.55) 0%, rgba(74,222,128,0.18) 100%)' },
    ink: { light: '#14532D', dark: '#86EFAC' },
    glow: { light: 'rgba(74,222,128,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipShareWhatsappTitle',
    bodyKey: 'tipShareWhatsappBody',
  },
  {
    id: 'share-pdf',
    emoji: '📄',
    gradient: { light: 'linear-gradient(135deg, #F43F5E 0%, #FECDD3 60%, #FFF1F2 100%)', dark: 'linear-gradient(135deg, rgba(244,63,94,0.55) 0%, rgba(244,63,94,0.18) 100%)' },
    ink: { light: '#881337', dark: '#FDA4AF' },
    glow: { light: 'rgba(244,63,94,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipSharePdfTitle',
    bodyKey: 'tipSharePdfBody',
  },
  {
    id: 'saved-lists',
    emoji: '📋',
    gradient: { light: 'linear-gradient(135deg, #A78BFA 0%, #DDD6FE 60%, #F5F3FF 100%)', dark: 'linear-gradient(135deg, rgba(167,139,250,0.55) 0%, rgba(167,139,250,0.18) 100%)' },
    ink: { light: '#4C1D95', dark: '#C4B5FD' },
    glow: { light: 'rgba(167,139,250,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipSavedListsTitle',
    bodyKey: 'tipSavedListsBody',
  },
  {
    id: 'branches-map',
    emoji: '🗺️',
    gradient: { light: 'linear-gradient(135deg, #22D3EE 0%, #A5F3FC 60%, #ECFEFF 100%)', dark: 'linear-gradient(135deg, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0.18) 100%)' },
    ink: { light: '#164E63', dark: '#67E8F9' },
    glow: { light: 'rgba(34,211,238,0.38)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipBranchesMapTitle',
    bodyKey: 'tipBranchesMapBody',
  },
  {
    id: 'mute-list',
    emoji: '🔕',
    gradient: { light: 'linear-gradient(135deg, #94A3B8 0%, #CBD5E1 60%, #F8FAFC 100%)', dark: 'linear-gradient(135deg, rgba(100,116,139,0.55) 0%, rgba(100,116,139,0.18) 100%)' },
    ink: { light: '#1E293B', dark: '#CBD5E1' },
    glow: { light: 'rgba(100,116,139,0.28)', dark: 'rgba(0,0,0,0.4)' },
    titleKey: 'tipMuteListTitle',
    bodyKey: 'tipMuteListBody',
  },
];
