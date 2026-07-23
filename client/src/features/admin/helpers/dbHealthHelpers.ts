import DescriptionIcon from '@mui/icons-material/Description';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LoginIcon from '@mui/icons-material/Login';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';

// תרגומי קולקציות לעברית + אייקון - תצוגה יותר ידידותית.
const COLLECTION_META: Record<string, { he: string; icon: React.ComponentType<{ sx?: object }>; color: string }> = {
  prices: { he: 'מחירים', icon: LocalGroceryStoreIcon, color: '#0D9488' },
  branches: { he: 'סניפים', icon: StorefrontIcon, color: '#14B8A6' },
  users: { he: 'משתמשים', icon: PeopleIcon, color: '#3B82F6' },
  lists: { he: 'רשימות קניות', icon: ListAltIcon, color: '#8B5CF6' },
  products: { he: 'מוצרים ברשימות', icon: DescriptionIcon, color: '#A78BFA' },
  notifications: { he: 'התראות', icon: NotificationsIcon, color: '#F59E0B' },
  loginactivities: { he: 'פעילות התחברות', icon: LoginIcon, color: '#6366F1' },
  dailyfaiths: { he: 'חיזוק יומי', icon: MenuBookIcon, color: '#EC4899' },
};
export const collectionMeta = (name: string) => COLLECTION_META[name] || { he: name, icon: DescriptionIcon, color: '#94A3B8' };

export const formatMB = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export interface StatusInfo {
  color: string; bg: string; icon: React.ComponentType<{ sx?: object }>;
  title: string; subtitle: string;
}
export const statusInfo = (status: 'ok' | 'warning' | 'critical', isDark: boolean): StatusInfo => {
  if (status === 'critical') return {
    color: '#DC2626', bg: isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2',
    icon: ErrorIcon, title: 'מצב קריטי', subtitle: 'יש לפעול בהקדם — שדרוג Plan או הקטנת TTL',
  };
  if (status === 'warning') return {
    color: '#D97706', bg: isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7',
    icon: WarningAmberIcon, title: 'צריך לעקוב', subtitle: 'הניצול גבוה — מומלץ לבדוק שוב בעוד יום-יומיים',
  };
  return {
    color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
    icon: CheckCircleIcon, title: 'הכל תקין', subtitle: 'יש מספיק מקום פנוי — אין מה לעשות',
  };
};

// אומדן ה-Tier של Atlas לפי הסף
export const tierName = (limitMB: number): string => {
  if (limitMB <= 512) return 'M0 Free';
  if (limitMB <= 2048) return 'M2 Shared';
  if (limitMB <= 5120) return 'M5 Shared';
  return 'Dedicated';
};
