import type { ProductCategory, ToastType } from '../types';
import type { TranslationKeys } from '../i18n/translations';

// ===== Category Icons =====
export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  'מוצרי חלב': '🧀',
  'מאפים': '🍞',
  'ירקות': '🥬',
  'פירות': '🍎',
  'בשר': '🥩',
  'משקאות': '☕',
  'ממתקים': '🍬',
  'ניקיון': '🧹',
  'אחר': '📦'
};

// ===== UI Constants =====
export const MEMBER_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];
export const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅', '🛒', '🛍️'];
export const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '🏠', '💑', '👨‍👩‍👧', '🛒', '🧺', '🍽️', '👪', '❤️', '🌟', '✨'];
export const LIST_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
export const SWIPE_ACTIONS_WIDTH = 200;

// ===== Brand Colors =====
export const BRAND_COLORS = {
  whatsapp: '#25D366',
  whatsappHover: '#1ebe5a',
  google: '#4285F4',
  primary: '#14B8A6',
  error: '#EF4444',
  errorHover: '#DC2626',
  success: '#22C55E'
} as const;

// ===== Swipe Constants =====
export const SWIPE_CONFIG = {
  debounceMs: 100,
  offsetClickThreshold: 10,
  openThreshold: 60
} as const;

// ===== Unified Size Constants =====
export const SIZES = {
  // Icon Button Sizes
  iconButton: {
    xs: { width: 32, height: 32 },
    sm: { width: 36, height: 36 },
    md: { width: 40, height: 40 },
    lg: { width: 44, height: 44 }
  },
  // Icon Sizes (inside buttons)
  icon: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 22
  },
  // Emoji Icon Sizes
  emoji: {
    sm: 18,
    md: 22,
    lg: 28,
    xl: 40
  },
  // Avatar Sizes
  avatar: {
    sm: { width: 36, height: 36, fontSize: 16 },
    md: { width: 44, height: 44, fontSize: 20 },
    lg: { width: 64, height: 64, fontSize: 28 },
    xl: { width: 80, height: 80, fontSize: 36 }
  },
  // Typography Sizes
  text: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24
  },
  // Spacing
  spacing: {
    xs: 0.5,
    sm: 1,
    md: 1.5,
    lg: 2,
    xl: 3
  },
  // Border Radius
  radius: {
    sm: '8px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    round: '50%'
  }
} as const;

// ===== Common Styles =====
export const COMMON_STYLES = {
  // Glass effect for buttons
  glassButton: {
    bgcolor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
  },
  // Card styles
  card: {
    borderRadius: SIZES.radius.lg,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #F1F5F9'
  },
  // Input field styles
  inputField: {
    borderRadius: SIZES.radius.md,
    border: '1.5px solid #E5E7EB',
    '&:focus-within': { borderColor: '#14B8A6' }
  },
  // Gradient backgrounds
  gradients: {
    primary: 'linear-gradient(135deg, #14B8A6, #10B981)',
    header: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)'
  }
} as const;

// ===== Menu Options for Add Popup =====
export interface MenuOption {
  id: 'private' | 'group' | 'join';
  icon: string;
  iconBg: string;
  titleKey: TranslationKeys;
  descKey: TranslationKeys;
}

export const MENU_OPTIONS: MenuOption[] = [
  {
    id: 'private',
    icon: '📝',
    iconBg: '#CCFBF1',
    titleKey: 'privateList',
    descKey: 'privateListDesc'
  },
  {
    id: 'group',
    icon: '👨‍👩‍👧‍👦',
    iconBg: '#E0E7FF',
    titleKey: 'sharedGroup',
    descKey: 'sharedGroupDesc'
  },
  {
    id: 'join',
    icon: '🔗',
    iconBg: '#D1FAE5',
    titleKey: 'joinExistingGroup',
    descKey: 'joinExistingGroupDesc'
  }
];

// ===== Storage Keys =====
// Only keys that are actually used - keep minimal to avoid state sync bugs
export const STORAGE_KEYS = {
  HINT_SEEN: 'sb_hint_seen',
  SETTINGS: 'sb_settings'
} as const;

// ===== Admin Configuration =====
export const ADMIN_CONFIG = {
  adminEmail: 'yaakovbenyizchak1@gmail.com'
} as const;

// ===== Default Settings =====
export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  language: 'he' as const,
  notifications: {
    enabled: true,
    groupJoin: true,
    groupLeave: true,
    listUpdate: true,
    productAdd: true,
    productDelete: true,
    productEdit: true,
    productPurchase: true
  }
};

// ===== Languages =====
export const LANGUAGES = [
  { code: 'he', name: 'עברית', nameEn: 'Hebrew' },
  { code: 'en', name: 'English', nameEn: 'English' },
  { code: 'ru', name: 'Русский', nameEn: 'Russian' }
] as const;

// ===== Toast Config =====
export const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; shadow: string }> = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' },
  warning: { icon: '⚠', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245, 158, 11, 0.3)' }
};
