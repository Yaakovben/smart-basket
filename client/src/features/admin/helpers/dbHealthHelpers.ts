import DescriptionIcon from '@mui/icons-material/Description';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LoginIcon from '@mui/icons-material/Login';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CloudQueueRoundedIcon from '@mui/icons-material/CloudQueueRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import HttpRoundedIcon from '@mui/icons-material/HttpRounded';

// לכל קולקציה: שם ידידותי (he), תיאור קצר של מה היא שומרת (desc), אייקון
// וצבע. השם *האמיתי* של הקולקציה מוצג ע"י הקומפוננטה מתוך c.name.
interface CollectionMeta {
  he: string;
  desc: string;
  icon: React.ComponentType<{ sx?: object }>;
  color: string;
}
const COLLECTION_META: Record<string, CollectionMeta> = {
  prices: { he: 'מחירים', desc: 'מחירי מוצרים מהרשתות (TTL 14 יום)', icon: LocalGroceryStoreIcon, color: '#0D9488' },
  branches: { he: 'סניפים', desc: 'סניפי רשתות + מיקום גאוגרפי', icon: StorefrontIcon, color: '#14B8A6' },
  users: { he: 'משתמשים', desc: 'חשבונות, פרופיל והעדפות', icon: PeopleIcon, color: '#3B82F6' },
  lists: { he: 'רשימות קניות', desc: 'רשימות, חברי קבוצה והגדרות', icon: ListAltIcon, color: '#8B5CF6' },
  products: { he: 'מוצרים ברשימות', desc: 'כל מוצר בכל רשימה + היסטוריה', icon: DescriptionIcon, color: '#A78BFA' },
  notifications: { he: 'התראות', desc: 'התראות אפליקציה למשתמשים', icon: NotificationsIcon, color: '#F59E0B' },
  loginactivities: { he: 'פעילות התחברות', desc: 'לוג כניסות (אימייל/גוגל/פתיחת אפליקציה)', icon: LoginIcon, color: '#6366F1' },
  dailyfaiths: { he: 'חיזוק יומי', desc: 'תוכן החיזוק היומי', icon: MenuBookIcon, color: '#EC4899' },
  refreshtokens: { he: 'טוקני רענון', desc: 'טוקני התחברות פעילים (TTL)', icon: VpnKeyIcon, color: '#64748B' },
  pushsubscriptions: { he: 'הרשמות פוש', desc: 'מנויי דחיפת התראות למכשירים', icon: PhoneIphoneIcon, color: '#EF4444' },
};
export const collectionMeta = (name: string): CollectionMeta =>
  COLLECTION_META[name] || { he: name, desc: 'קולקציה במסד', icon: DescriptionIcon, color: '#94A3B8' };

// מטא-דאטה לכל מדד Cloudinary - אותה שפה עיצובית כמו CollectionMeta למעלה
// (שורה בסגנון "קולקשן"): שם *אמיתי* (en, בדיוק כמו ש-Cloudinary עצמו קורא
// למדד ב-API/בדשבורד שלהם - לא תרגום), שם ידידותי בעברית לצידו, והסבר קצר
// שנפתח רק בלחיצה (לא תמיד גלוי - אלה 5 שורות, לא רוצים גוש טקסט קבוע).
export interface CloudinaryMetricMeta {
  en: string;
  he: string;
  desc: string;
  icon: React.ComponentType<{ sx?: object }>;
  color: string;
}
export const CLOUDINARY_METRIC_META: Record<string, CloudinaryMetricMeta> = {
  storage: {
    en: 'Storage', he: 'אחסון',
    desc: 'הנפח הכולל שתופסות כל התמונות המאוחסנות כרגע ב-Cloudinary.',
    icon: CloudQueueRoundedIcon, color: '#0D9488',
  },
  bandwidth: {
    en: 'Bandwidth', he: 'תעבורה',
    desc: 'כמות הנתונים שהוגשה החודש - כל פעם שתמונה נטענת אצל משתמש נספרת כאן.',
    icon: SwapHorizRoundedIcon, color: '#3B82F6',
  },
  transformations: {
    en: 'Transformations', he: 'טרנספורמציות',
    desc: 'כמה גרסאות של תמונה (הקטנה, שינוי פורמט, טשטוש וכו׳) נוצרו החודש.',
    icon: TuneRoundedIcon, color: '#8B5CF6',
  },
  objects: {
    en: 'Objects', he: 'קבצים מאוחסנים',
    desc: 'מספר קבצי התמונה המאוחסנים כרגע - נספר ישירות מה-DB שלנו, מתעדכן מיד אחרי העלאה (בניגוד לשאר המדדים כאן, שמתעדכנים אצל Cloudinary בעיכוב).',
    icon: PhotoLibraryRoundedIcon, color: '#0D9488',
  },
  requests: {
    en: 'Requests', he: 'בקשות',
    desc: 'כמה בקשות API בוצעו מול Cloudinary החודש - כולל הצגת תמונות, העלאות ועיבודים.',
    icon: HttpRoundedIcon, color: '#1D4ED8',
  },
};

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
