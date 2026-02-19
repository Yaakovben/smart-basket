import type { ProductCategory } from '../types';
import type { TranslationKeys } from '../i18n/translations';

// ===== אייקוני קטגוריות =====
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

// ===== מפתחות תרגום קטגוריות =====
export const CATEGORY_TRANSLATION_KEYS: Record<ProductCategory, TranslationKeys> = {
  'מוצרי חלב': 'catDairy',
  'מאפים': 'catBakery',
  'ירקות': 'catVegetables',
  'פירות': 'catFruits',
  'בשר': 'catMeat',
  'משקאות': 'catBeverages',
  'ממתקים': 'catSweets',
  'ניקיון': 'catCleaning',
  'אחר': 'catOther',
};

// ===== קבועי UI =====
export const MEMBER_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];
export const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅', '🛒', '🛍️'];
export const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '🏠', '💑', '👨‍👩‍👧', '🛒', '🧺', '🍽️', '👪', '❤️', '🌟', '✨'];
export const LIST_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
export const SWIPE_ACTIONS_WIDTH = 200;

// ===== צבעי מותג =====
export const BRAND_COLORS = {
  whatsapp: '#25D366',
  whatsappHover: '#1ebe5a',
  google: '#4285F4',
  primary: '#14B8A6',
  error: '#EF4444',
  errorHover: '#DC2626',
  success: '#22C55E'
} as const;

// ===== קבועי Swipe =====
export const SWIPE_CONFIG = {
  debounceMs: 100,
  offsetClickThreshold: 10,
  openThreshold: 60
} as const;

// ===== קבועי גדלים =====
export const SIZES = {
  // גדלי כפתור אייקון
  iconButton: {
    xs: { width: 32, height: 32 },
    sm: { width: 36, height: 36 },
    md: { width: 40, height: 40 },
    lg: { width: 44, height: 44 }
  },
  // גדלי אייקון (בתוך כפתורים)
  icon: {
    xs: 16,
    sm: 18,
    md: 20,
    lg: 22
  },
  // גדלי אמוג'י
  emoji: {
    sm: 18,
    md: 22,
    lg: 28,
    xl: 40
  },
  // גדלי אווטאר
  avatar: {
    sm: { width: 36, height: 36, fontSize: 16 },
    md: { width: 44, height: 44, fontSize: 20 },
    lg: { width: 64, height: 64, fontSize: 28 },
    xl: { width: 80, height: 80, fontSize: 36 }
  },
  // גדלי טקסט
  text: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24
  },
  // ריווח
  spacing: {
    xs: 0.5,
    sm: 1,
    md: 1.5,
    lg: 2,
    xl: 3
  },
  // עיגול פינות
  radius: {
    sm: '8px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    round: '50%'
  }
} as const;

// ===== סגנונות משותפים =====
export const COMMON_STYLES = {
  // אפקט זכוכית לכפתורים
  glassButton: {
    bgcolor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
  },
  // סגנון כרטיס
  card: {
    borderRadius: SIZES.radius.lg,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #F1F5F9'
  },
  // סגנון שדה קלט
  inputField: {
    borderRadius: SIZES.radius.md,
    border: '1.5px solid #E5E7EB',
    '&:focus-within': { borderColor: '#14B8A6' }
  },
  // רקעים גרדיאנטיים
  gradients: {
    primary: 'linear-gradient(135deg, #14B8A6, #10B981)',
    header: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)'
  },
  // תווית שדה במודאלים
  label: {
    fontSize: SIZES.text.md - 1,
    fontWeight: 600,
    color: 'text.secondary',
    mb: 1
  }
} as const;

// ===== אפשרויות תפריט הוספה =====
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

// ===== מפתחות אחסון =====
export const STORAGE_KEYS = {
  HINT_SEEN: 'sb_hint_seen',
  SETTINGS: 'sb_settings'
} as const;

// ===== הגדרות מנהל =====
export const ADMIN_CONFIG = {
  adminEmail: 'yaakovbenyizchak1@gmail.com'
} as const;

// ===== הגדרות ברירת מחדל =====
export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  language: 'he' as const,
  notifications: {
    enabled: true,
    groupJoin: true,
    groupLeave: true,
    groupRemoved: true,
    groupDelete: true,
    listUpdate: true,
    productAdd: true,
    productDelete: true,
    productEdit: true,
    productPurchase: true,
    mutedGroupIds: [] as string[]
  }
};

// ===== שפות =====
export const LANGUAGES = [
  { code: 'he', name: 'עברית', nameEn: 'Hebrew' },
  { code: 'en', name: 'English', nameEn: 'English' },
  { code: 'ru', name: 'Русский', nameEn: 'Russian' }
] as const;