import { useNavigate } from 'react-router-dom';
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Card, Tabs, Tab,
  Chip, Avatar, Badge, InputAdornment, Alert, CircularProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DoneIcon from '@mui/icons-material/Done';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type { List, Product, User, ToastType } from '../../../global/types';
import type { LocalNotification } from '../../../global/hooks';
import type { PersistedNotification } from '../../../services/api';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic, LIST_ICONS, GROUP_ICONS, LIST_COLORS, MENU_OPTIONS, SIZES, COMMON_STYLES, canShowSecondaryPopup, markPopupShown } from '../../../global/helpers';
import { Modal, ConfirmModal, ListMenu, QRScanner } from '../../../global/components';
import { EditListModal } from '../../list/components/ListModals';
import { useSettings } from '../../../global/context/SettingsContext';
import { useHome } from '../hooks/useHome';
import { usePushNotifications } from '../../../global/hooks';
import { NotificationItem } from './NotificationItem';
import { authApi } from '../../../services/api';

// ===== אנימציות =====
const checkmarkPopKeyframes = {
  '@keyframes checkmarkPop': {
    '0%': { transform: 'scale(0)', opacity: 0 },
    '50%': { transform: 'scale(1.3)' },
    '100%': { transform: 'scale(1)', opacity: 1 }
  }
};

const shakeKeyframes = {
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%, 75%': { transform: 'translateX(-2px)' },
    '50%': { transform: 'translateX(2px)' }
  }
};

// ===== סגנונות =====
const glassButtonSx = COMMON_STYLES.glassIconButton;

const iconSelectSx = (isSelected: boolean) => ({
  width: 44,
  height: 44,
  borderRadius: '10px',
  border: isSelected ? '2px solid' : '1.5px solid',
  borderColor: isSelected ? 'primary.main' : 'divider',
  bgcolor: isSelected ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:hover': { borderColor: 'primary.main' }
});

const colorSelectSx = (isSelected: boolean) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: isSelected ? '3px solid' : '3px solid transparent',
  borderColor: isSelected ? 'text.primary' : 'transparent',
  cursor: 'pointer',
  transition: 'transform 0.15s',
  '&:hover': { transform: 'scale(1.1)' }
});

// ===== ברכה לפי שעה =====
const getTimeGreeting = (): TranslationKeys => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'goodMorning';
  if (hour >= 12 && hour < 17) return 'goodAfternoon';
  if (hour >= 17 && hour < 22) return 'goodEvening';
  return 'goodNight';
};

// ===== אימוג'י לפי שעה - מוסיף אישיות קטנה לכותרת =====
const getTimeEmoji = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return '🌅';   // זריחה
  if (hour >= 8 && hour < 12) return '☀️';   // בוקר
  if (hour >= 12 && hour < 17) return '🌤️'; // צהריים
  if (hour >= 17 && hour < 20) return '🌆'; // ערב
  if (hour >= 20 && hour < 22) return '🌃'; // לילה מוקדם
  return '🌙';                              // לילה
};

// ===== מסר משני קטן ליום בשבוע =====
const getWeekdayMessage = (t: (k: TranslationKeys) => string): string | null => {
  const day = new Date().getDay(); // 0=ראשון, 5=שישי, 6=שבת
  const hour = new Date().getHours();
  // יום שישי בבוקר/צהריים - "מתכוננים לשבת?"
  if (day === 5 && hour >= 6 && hour < 16) return 'מתכוננים לשבת? 🕯️';
  // מוצ"ש - "סוף שבוע 🎉"
  if (day === 6 && hour >= 19) return 'תשבוע חדש 💪';
  // ראשון בבוקר - התחלה חדשה
  if (day === 0 && hour >= 6 && hour < 12) return 'שבוע חדש מתחיל 🚀';
  return null;
  // הפניה ל-t להתאמה עתידית לתרגום (כרגע לא בשימוש)
  void t;
};

// ===== קומפוננטת כרטיס רשימה =====
interface ListCardProps {
  list: List;
  isMuted: boolean;
  isOwner: boolean;
  onSelect: (list: List) => void;
  onEditList: (list: List) => void;
  onDeleteList: (list: List) => void;
  onLeaveList?: (list: List) => void;
  onToggleMute: (listId: string) => void;
  t: (key: TranslationKeys) => string;
  reorderMode?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragHandleTouch?: (e: React.TouchEvent) => void;
  onDragHandleMouse?: (e: React.MouseEvent) => void;
}

const ListCard = memo(({ list: l, isMuted, isOwner, onSelect, onEditList, onDeleteList, onLeaveList, onToggleMute, t, reorderMode, isDragging, isDragOver, onDragHandleTouch, onDragHandleMouse }: ListCardProps) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const mainNotificationsOff = !settings.notifications.enabled;
  const totalProducts = l.products.length;
  const count = l.products.filter((p: Product) => !p.isPurchased).length;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const handleClick = useCallback(() => {
    if (reorderMode) return;
    onSelect(l);
  }, [reorderMode, onSelect, l]);

  return (
    <Card sx={{
      display: 'flex', alignItems: 'center', gap: 1.75, p: 2, mb: 1,
      cursor: reorderMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      transition: isDragging ? 'box-shadow 0.15s' : 'all 0.2s ease',
      transform: isDragging ? 'scale(1.03)' : isDragOver ? 'translateY(4px)' : 'none',
      opacity: isDragging ? 0.95 : 1,
      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : isDragOver ? '0 -3px 0 0 #14B8A6' : undefined,
      position: 'relative',
      zIndex: isDragging ? 10 : 'auto',
      bgcolor: isDragging ? 'action.hover' : undefined,
      userSelect: reorderMode ? 'none' : 'auto',
      WebkitUserSelect: reorderMode ? 'none' : 'auto',
      touchAction: reorderMode ? 'none' : 'auto',
    }}
      onClick={handleClick}
      onTouchStart={reorderMode ? onDragHandleTouch : undefined}
      onMouseDown={reorderMode ? onDragHandleMouse : undefined}
    >
      {reorderMode && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, p: 0.5, mx: -0.5 }}>
          <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
        </Box>
      )}
      <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {l.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{l.name}</Typography>
          <Chip label={l.isGroup ? t('group') : t('private')} size="small" sx={{ bgcolor: l.isGroup ? (isDark ? 'rgba(20,184,166,0.15)' : '#CCFBF1') : (isDark ? 'rgba(3,105,161,0.15)' : '#E0F2FE'), color: l.isGroup ? (isDark ? '#5EEAD4' : '#0D9488') : (isDark ? '#7DD3FC' : '#0369A1'), height: 22, flexShrink: 0 }} />
        </Box>
        <Typography sx={{ fontSize: 13, color: count > 0 ? 'warning.main' : totalProducts > 0 ? 'success.main' : 'text.disabled' }}>
          {count > 0 ? `${count} ${t('items')}` : totalProducts > 0 ? `✓ ${t('completed')}` : `0 ${t('items')}`}
          {l.isGroup && <Typography component="span" sx={{ fontSize: 12, color: 'text.disabled' }}>{' '}· {l.members.length + 1} {t('members')}</Typography>}
        </Typography>
      </Box>
      {/* אייקון מושתק + תפריט שלוש נקודות (מוסתר במצב סידור) */}
      {!reorderMode && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        {isMuted && <NotificationsOffIcon sx={{ fontSize: 22, color: 'text.disabled' }} />}
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
          sx={{ color: 'text.secondary', width: 36, height: 36 }}
        >
          <MoreVertIcon sx={{ fontSize: 22 }} />
        </IconButton>
        <ListMenu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          isGroup={l.isGroup}
          isOwner={isOwner}
          isMuted={isMuted}
          mainNotificationsOff={mainNotificationsOff}
          onToggleMute={() => onToggleMute(l.id)}
          onEdit={() => onEditList(l)}
          onDelete={() => onDeleteList(l)}
          onLeave={!isOwner && l.isGroup && onLeaveList ? () => onLeaveList(l) : undefined}
          stopPropagation
        />
      </Box>}
    </Card>
  );
});

ListCard.displayName = 'ListCard';

// ===== ממשק Props =====
interface HomePageProps {
  lists: List[];
  listsFetchError?: boolean;
  user: User;
  onSelectList: (list: List) => void;
  onCreateList: (list: { name: string; icon: string; color: string; isGroup: boolean; password?: string | null }) => void | Promise<void>;
  onDeleteList: (listId: string) => void | Promise<void>;
  onLeaveList?: (listId: string) => void | Promise<void>;
  onEditList: (list: List) => void | Promise<void>;
  onJoinGroup: (code: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  showToast: (message: string, type?: ToastType) => void;
  // התראות שמורות מה-API
  persistedNotifications?: PersistedNotification[];
  notificationsLoading?: boolean;
  onMarkPersistedNotificationRead?: (notificationId: string) => void;
  onClearAllPersistedNotifications?: (listId?: string) => void;
}

// בדיקה אם רץ בדפדפן (לא PWA מותקן)
const isInBrowser = () => {
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return false;
  return true;
};

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

// מקש אחסון: דחייה לצמיתות
const PWA_DISMISSED_KEY = 'pwa_install_seen';

const PwaInstallPrompt = memo(({ t }: { t: (key: TranslationKeys) => string }) => {
  const [show, setShow] = useState(false);
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  useEffect(() => {
    // תנאי סף בסיסיים: רק בדפדפן ולא נדחה לצמיתות
    if (!isInBrowser()) return;
    if (localStorage.getItem(PWA_DISMISSED_KEY)) return;

    // תיאום עם popups אחרים - לא להופיע אם החיזוק היומי הוצג היום או ששכנו אחר פעיל
    if (!canShowSecondaryPopup()) return;

    // 3 שניות אחרי טעינת הבית
    const timer = setTimeout(() => {
      // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
      if (!canShowSecondaryPopup()) return;
      markPopupShown('pwa-install');
      setShow(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(PWA_DISMISSED_KEY, '1');
  }, []);

  if (!show) return null;

  const ios = isIOS();

  return (
    <Box sx={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1300,
      pb: 'max(16px, env(safe-area-inset-bottom))',
      px: 2, pt: 0,
      animation: 'pwaSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
      '@keyframes pwaSlideUp': {
        from: { transform: 'translateY(110%)', opacity: 0 },
        to: { transform: 'translateY(0)', opacity: 1 },
      },
    }}>
      <Box sx={{
        bgcolor: isDark ? '#1E293B' : 'white',
        borderRadius: '22px',
        boxShadow: isDark
          ? '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)'
          : '0 -8px 40px rgba(20,184,166,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* רצועת צבע עליונה עדינה */}
        <Box sx={{
          height: 3,
          background: 'linear-gradient(90deg, #14B8A6, #10B981, #14B8A6)',
          backgroundSize: '200% 100%',
          animation: 'pwaShine 3s ease-in-out infinite',
          '@keyframes pwaShine': {
            '0%, 100%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
          },
        }} />

        <Box sx={{ p: 2.5 }}>
          {/* ראש: אייקון + כותרת + X */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px',
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, flexShrink: 0,
              boxShadow: '0 6px 16px rgba(20,184,166,0.35)',
            }}>
              📲
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                {t('appName')}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3, mt: 0.25 }}>
                {t('installIosHint')}
              </Typography>
            </Box>
            <IconButton
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDismiss}
              size="small"
              sx={{ color: 'text.secondary', width: 32, height: 32, flexShrink: 0 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* צעדים - כרטיסים נקיים עם מספר בעיגול */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            {[1, 2].map((num) => (
              <Box
                key={num}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.06)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.15)',
                  borderRadius: '12px',
                }}
              >
                <Box sx={{
                  width: 24, height: 24, borderRadius: '50%',
                  bgcolor: '#14B8A6',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {num}
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.4, flex: 1 }}>
                  {num === 1
                    ? (ios ? t('installStep1Ios') : t('installStep1Android'))
                    : (ios ? t('installStep2Ios') : t('installStep2Android'))}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* כפתור יחיד */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleDismiss}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.25,
              fontSize: 14,
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              boxShadow: '0 4px 12px rgba(20,184,166,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0D9488, #0B7C72)',
                boxShadow: '0 6px 16px rgba(20,184,166,0.45)',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            {t('installDismiss')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});
PwaInstallPrompt.displayName = 'PwaInstallPrompt';

export const HomeComponent = memo(({
  lists, listsFetchError = false, onSelectList, onCreateList, onDeleteList, onLeaveList, onEditList, onJoinGroup, onLogout, user, showToast,
  persistedNotifications = [], notificationsLoading = false, onMarkPersistedNotificationRead, onClearAllPersistedNotifications
}: HomePageProps) => {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const { t, settings, isGroupMuted, toggleGroupMute, updateNotifications } = useSettings();
  const isDark = settings.theme === 'dark';

  // ברכות וזמן - מחשבים פעם אחת בעת mount ולא בכל render. הזמן לא משתנה
  // בתוך אותו טאב פתוח באופן שדורש עדכון, ופונקציות אלו קוראות ל-new Date()
  // שהוא עלות מיותרת ב-render חוזר.
  const greeting = useMemo(() => ({
    label: t(getTimeGreeting()),
    emoji: getTimeEmoji(),
    weekdayMsg: getWeekdayMessage(t),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const { isSupported: pushSupported, isPwaInstalled, isSubscribed: pushSubscribed, permission: pushPermission, subscribe: subscribePush, loading: pushLoading } = usePushNotifications();

  // מצב הצעת התראות push
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  // סורק QR להצטרפות — נפתח מתוך JoinModal
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [pushPromptError, setPushPromptError] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(() => {
    return localStorage.getItem('pushPromptDismissed') === 'true';
  });

  // אנימציית סגירה לתפריט "מה תרצה ליצור?" - state בלבד, ה-callback מוגדר
  // אחרי useList כי הוא תלוי ב-setShowMenu שמגיע משם.
  const [menuClosing, setMenuClosing] = useState(false);

  // הצגת הצעת push לאחר השהיה - רק אם אין popup אחר על המסך הסשן הזה
  useEffect(() => {
    if (pushSupported && isPwaInstalled && !pushSubscribed && !pushPromptDismissed && !pushLoading && pushPermission !== 'denied') {
      if (!canShowSecondaryPopup()) return;
      const timer = setTimeout(() => {
        // בדיקה מחודשת רגע לפני הצגה - שמא בינתיים הופיע popup אחר
        if (!canShowSecondaryPopup()) return;
        markPopupShown('push-notify');
        setShowPushPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [pushSupported, isPwaInstalled, pushSubscribed, pushPromptDismissed, pushLoading, pushPermission]);

  const handleEnablePush = async () => {
    setPushPromptError(false);
    const success = await subscribePush();
    if (success) {
      setShowPushPrompt(false);
    } else {
      // הצגת שגיאה בהצעה - סגירת הפרומפט וניווט להגדרות לפרטים
      handleDismissPushPrompt();
    }
  };

  const handleDismissPushPrompt = () => {
    setShowPushPrompt(false);
    setPushPromptDismissed(true);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  const {
    tab, search, showMenu, showCreate, showCreateGroup, showJoin,
    showNotifications, confirmLogout, editList, confirmDeleteList,
    newL, joinCode, joinPass, joinError, createError, joiningGroup, joinCooldown, creatingList, savingList,
    userLists, my, groups, display,
    setTab, setSearch, setShowMenu, setShowNotifications, setConfirmLogout,
    setEditList, setConfirmDeleteList, setJoinCode, setJoinPass, setJoinError,
    handleCreate, handleJoin, openOption, closeCreateModal, closeCreateGroupModal,
    closeJoinModal, updateNewListField, saveEditList,
    deleteList
  } = useHome({
    lists, user, onCreateList, onDeleteList, onEditList, onJoinGroup, showToast
  });

  // closeMenu - ממקם כאן כי הוא תלוי ב-setShowMenu שמגיע מ-useList
  const closeMenu = useCallback(() => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setShowMenu(false);
      setMenuClosing(false);
    }, 280);
  }, [setShowMenu]);

  // ===== אדפטר עבור EditListModal המשותף =====
  const editListOriginal = useRef<List | null>(null);
  if (editList && (!editListOriginal.current || editListOriginal.current.id !== editList.id)) {
    editListOriginal.current = editList;
  }
  if (!editList) editListOriginal.current = null;

  const editListData = editList ? { name: editList.name, icon: editList.icon, color: editList.color } : null;
  const editListHasChanges = !!(editList && editListOriginal.current && (
    editList.name !== editListOriginal.current.name ||
    editList.icon !== editListOriginal.current.icon ||
    editList.color !== editListOriginal.current.color
  ));

  // מצב סידור רשימות
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const dragIndexRef = useRef(-1);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollRef = useRef<number | null>(null);
  const originalOrderRef = useRef<string[]>([]);
  const lastMoveTimeRef = useRef(0);

  // חישוב סדר תצוגה עם סדר מותאם אישית
  const orderedDisplay = useMemo(() => {
    const order = reorderedIds || user.listOrder;
    if (!order || order.length === 0) return display;
    const orderMap = new Map(order.map((id, idx) => [id, idx]));
    return [...display].sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      return 0;
    });
  }, [display, reorderedIds, user.listOrder]);

  // גרירה: חישוב אינדקס יעד לפי מיקום Y
  const getTargetIndex = useCallback((clientY: number): number => {
    for (let i = 0; i < cardRefs.current.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return cardRefs.current.length - 1;
  }, []);

  // גרירה: התחלת גרירה (clientY מגיע מה-listener אך לא נדרש כאן)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragStart = useCallback((index: number, _clientY: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
    haptic('medium');
  }, []);

  // גרירה: תנועה - throttle למניעת עומס ברשימות ארוכות
  const handleDragMove = useCallback((clientY: number) => {
    const currentIdx = dragIndexRef.current;
    if (currentIdx < 0) return;

    // גלילה אוטומטית כשגוררים לקצוות המסך (תמיד, ללא throttle)
    const SCROLL_ZONE = 100;
    const SCROLL_SPEED = 5;
    const container = contentRef.current;
    if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    if (container) {
      const rect = container.getBoundingClientRect();
      if (clientY < rect.top + SCROLL_ZONE) {
        const tick = () => { container.scrollBy(0, -SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(tick); };
        autoScrollRef.current = requestAnimationFrame(tick);
      } else if (clientY > rect.bottom - SCROLL_ZONE) {
        const tick = () => { container.scrollBy(0, SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(tick); };
        autoScrollRef.current = requestAnimationFrame(tick);
      }
    }

    // throttle: מקסימום עדכון סדר כל 50ms
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 50) return;
    lastMoveTimeRef.current = now;

    const targetIdx = getTargetIndex(clientY);
    if (targetIdx !== currentIdx) {
      setReorderedIds(prev => {
        if (!prev) return prev;
        const newIds = [...prev];
        const [moved] = newIds.splice(currentIdx, 1);
        newIds.splice(targetIdx, 0, moved);
        return newIds;
      });
      dragIndexRef.current = targetIdx;
      setDragIndex(targetIdx);
      setDragOverIndex(targetIdx);
      haptic('light');
    }
  }, [getTargetIndex]);

  // גרירה: סיום
  const handleDragEnd = useCallback(() => {
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    dragIndexRef.current = -1;
    setDragIndex(-1);
    setDragOverIndex(-1);
  }, []);

  // touch/mouse event handlers
  useEffect(() => {
    if (dragIndex < 0) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragIndex, handleDragMove, handleDragEnd]);

  const handleSaveOrder = useCallback(async () => {
    if (reorderedIds) {
      try {
        await authApi.updateListOrder(reorderedIds);
        user.listOrder = reorderedIds;
        showToast(t('orderSaved'));
      } catch {
        showToast(t('errorOccurred'), 'error');
      }
    }
    setReorderMode(false);
    setReorderedIds(null);
  }, [reorderedIds, user, showToast, t]);

  const handleEnterReorder = useCallback(() => {
    const ids = orderedDisplay.map(l => l.id);
    originalOrderRef.current = ids;
    setReorderMode(true);
    setReorderedIds(ids);
    haptic('medium');
  }, [orderedDisplay]);

  // בדיקה אם הסדר השתנה
  const hasOrderChanges = useMemo(() => {
    if (!reorderedIds) return false;
    const original = originalOrderRef.current;
    if (reorderedIds.length !== original.length) return true;
    return reorderedIds.some((id, i) => id !== original[i]);
  }, [reorderedIds]);

  // ביטול מצב סידור
  const handleCancelReorder = useCallback(() => {
    setReorderMode(false);
    setReorderedIds(null);
  }, []);

  // מצב אישור עזיבת רשימה
  const [confirmLeaveList, setConfirmLeaveList] = useState<List | null>(null);

  const handleLeaveList = useCallback(async () => {
    if (!confirmLeaveList || !onLeaveList) return;
    try {
      await onLeaveList(confirmLeaveList.id);
      setConfirmLeaveList(null);
      showToast(t('left'));
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [confirmLeaveList, onLeaveList, showToast, t]);

  // מעקב אחר התראות שנסגרות (לצורך אנימציה)
  const [dismissingNotifications, setDismissingNotifications] = useState<Set<string>>(new Set());

  // המרת התראות שמורות לפורמט תצוגה
  const allNotifications = useMemo(() => {
    return persistedNotifications
      .filter(n => !n.read)
      .map(n => ({
        id: n.id,
        type: (n.type === 'product_update' ? 'product_edit' : n.type) as LocalNotification['type'],
        listId: n.listId,
        listName: n.listName,
        userId: n.actorId,
        userName: n.actorName,
        timestamp: new Date(n.createdAt),
        read: n.read,
        isLocal: false,
        productName: n.productName,
        isPurchased: n.type === 'product_purchase' ? true : n.type === 'product_unpurchase' ? false : undefined
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [persistedNotifications]);

  // חישוב סה"כ לא נקראו
  const totalUnreadCount = allNotifications.length;

  const handleDismissNotification = useCallback((_listId: string, notificationId: string) => {
    // הוספה לסט נסגרות להפעלת אנימציה
    setDismissingNotifications(prev => new Set(prev).add(notificationId));

    // סימון כנקראה
    onMarkPersistedNotificationRead?.(notificationId);

    // ניקוי מסט נסגרות לאחר סיום אנימציה
    setTimeout(() => {
      setDismissingNotifications(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }, 600);
  }, [onMarkPersistedNotificationRead]);

  const handleMarkAllRead = useCallback(() => {
    onClearAllPersistedNotifications?.();
  }, [onClearAllPersistedNotifications]);

  // Ref לשדה סיסמה במודאל הצטרפות
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // פוקוס אוטומטי לשדה סיסמה כשהקוד מושלם
  useEffect(() => {
    if (joinCode.length === 6 && showJoin) {
      passwordInputRef.current?.focus();
    }
  }, [joinCode, showJoin]);

  return (
    <>
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
        p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
        borderRadius: '0 0 24px 24px',
        flexShrink: 0,
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(20, 184, 166, 0.15)',
        // מסך זעיר (Qin F21 Pro) - padding מצומצם
        '@media (max-width: 360px)': {
          p: 'max(36px, env(safe-area-inset-top) + 8px) 12px 14px',
          borderRadius: '0 0 18px 18px',
        },
        // מסך זעיר במיוחד ≤320px - דחיסה אגרסיבית גם ב-portrait
        '@media (max-width: 320px)': {
          p: 'max(28px, env(safe-area-inset-top) + 6px) 10px 10px',
          borderRadius: '0 0 14px 14px',
          '& .MuiAvatar-root': { width: '36px !important', height: '36px !important', fontSize: '14px !important' },
          '& .MuiOutlinedInput-root': { minHeight: '34px !important' },
          '& .MuiOutlinedInput-input': { fontSize: '13px !important' },
          '& .MuiTab-root': { minHeight: '28px !important', fontSize: '11.5px !important' },
          '& > .MuiBox-root': { marginBottom: '6px !important' },
        },
        // Landscape - דחיסה מקסימלית
        '@media (orientation: landscape) and (max-height: 500px)': {
          p: 'max(2px, env(safe-area-inset-top) + 2px) 12px 4px',
          borderRadius: '0 0 8px 8px',
          // אווטאר 26px
          '& .MuiAvatar-root': { width: '26px !important', height: '26px !important', fontSize: '12px !important' },
          '& > .MuiBox-root': { marginBottom: '3px !important' },
          // קלט גובה 28
          '& .MuiOutlinedInput-root': { minHeight: '28px !important' },
          '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '2px !important' },
          // טאבים: ויזואלית קטן + tap-target מורחב (a11y)
          '& .MuiTab-root': {
            minHeight: '24px !important', py: '0px !important', fontSize: '11.5px !important',
            position: 'relative',
            '&::before': { content: '""', position: 'absolute', inset: '-6px 0' },
          },
          // כפתורי אייקון: ויזואלית 26, אזור לחיצה 42x42
          '& [class*="MuiIconButton-root"]': {
            width: '26px !important', height: '26px !important',
            position: 'relative',
            '&::before': { content: '""', position: 'absolute', inset: '-8px' },
          },
          '& [class*="MuiIconButton-root"] .MuiSvgIcon-root': { fontSize: '15px !important' },
        },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              onClick={() => navigate('/profile')}
              sx={{ bgcolor: user.avatarColor || 'rgba(255,255,255,0.25)', cursor: 'pointer', width: 44, height: 44, fontSize: 18, border: '2px solid rgba(255,255,255,0.3)' }}
            >
              {user.avatarEmoji || user.name.charAt(0)}
            </Avatar>
            <Box>
              {/* ברכה עם אימוג'י לפי שעה - הופך את הכניסה לאישית יותר */}
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>{greeting.emoji}</Box>
                {greeting.label}
              </Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{user.name}</Typography>
              {greeting.weekdayMsg && (
                <Typography sx={{
                  fontSize: 11, color: 'rgba(255,255,255,0.85)', mt: 0.3,
                  fontWeight: 600, letterSpacing: 0.2,
                }}>
                  {greeting.weekdayMsg}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconButton onClick={() => setShowNotifications(true)} sx={glassButtonSx}>
              <Badge badgeContent={totalUnreadCount} color="error" invisible={totalUnreadCount === 0} sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 700, minWidth: 16, height: 16 } }}>
                <NotificationsIcon sx={{ color: 'white', fontSize: 22, opacity: notificationsLoading ? 0.5 : 1, transition: 'opacity 0.2s' }} />
              </Badge>
            </IconButton>
            <IconButton onClick={() => navigate('/settings')} sx={glassButtonSx}>
              <SettingsIcon sx={{ color: 'white', fontSize: 22 }} />
            </IconButton>
          </Box>
        </Box>

        <TextField
          fullWidth
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: '12px' }, '& .MuiOutlinedInput-input': { fontSize: 16 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled' }} /></InputAdornment> }}
        />

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: { xs: '10px', sm: '12px' },
            p: { xs: 0.5, sm: 0.6 },
            minHeight: 'auto',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              borderRadius: { xs: '8px', sm: '10px' },
              py: { xs: 1.25, sm: 1.5 },
              minHeight: 'auto',
              fontSize: { xs: 15, sm: 16 },
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
            }
          }}
        >
          <Tab value="all" label={`${t('all')} (${userLists.length})`} />
          <Tab value="my" label={`${t('myLists')} (${my.length})`} />
          <Tab value="groups" label={`${t('groups')} (${groups.length})`} />
        </Tabs>
      </Box>

      {/* Content - overscrollBehavior:contain מונע מ-pull-to-refresh ב-iOS להזיז את הבר */}
      <Box ref={contentRef} sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', p: { xs: 2, sm: 2.5 }, pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 'calc(70px + env(safe-area-inset-bottom))' }, WebkitOverflowScrolling: 'touch' }}>
        {/* מצב שגיאת חיבור: השרת למטה ואין רשימות */}
        {listsFetchError && lists.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
            <Box sx={{ width: { xs: 100, sm: 120 }, height: { xs: 100, sm: 120 }, borderRadius: '50%', bgcolor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2.5, sm: 3 } }}>
              <CloudOffIcon sx={{ fontSize: { xs: 48, sm: 56 }, color: 'error.main', opacity: 0.8 }} />
            </Box>
            <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: 'text.primary', mb: 1 }}>
              {t('connectionErrorTitle')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', mb: { xs: 3, sm: 4 }, maxWidth: { xs: 260, sm: 280 } }}>
              {t('connectionErrorDesc')}
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={() => window.location.reload()}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2.5, sm: 3 }, py: { xs: 1.25, sm: 1.5 }, fontSize: { xs: 14, sm: 15 } }}
            >
              <RefreshIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              <span>{t('tryAgain')}</span>
            </Button>
          </Box>
        ) : display.length === 0 ? (
          // ממלא את כל הגובה כדי שהאייקון יהיה במרכז אנכי במסך, לא מעל באמצע
          <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
            {/* דמות ידידותית - אייקון מרכזי שצף + פריטים מרחפים סביב לתחושת חיים */}
            <Box sx={{ position: 'relative', width: 180, height: 180, mb: { xs: 2, sm: 2.5 } }}>
              <Box sx={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: tab === 'groups'
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.06))'
                  : 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.06))',
                animation: 'pulseRing 3s ease-in-out infinite',
                '@keyframes pulseRing': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                },
              }} />
              <Box sx={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 72,
                animation: 'floatMain 3s ease-in-out infinite',
                '@keyframes floatMain': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-6px)' },
                },
              }}>
                {tab === 'groups' ? '👥' : '🛒'}
              </Box>
              {(tab === 'groups' ? ['💬', '🤝', '🎉', '✨'] : ['🥕', '🍞', '🥛', '🍎']).map((emoji, i) => (
                <Box key={i} sx={{
                  position: 'absolute', fontSize: 22,
                  top: ['10%', '12%', '70%', '68%'][i],
                  left: ['10%', '78%', '8%', '78%'][i],
                  animation: `floatItem 2.8s ease-in-out ${i * 0.3}s infinite`,
                  '@keyframes floatItem': {
                    '0%, 100%': { transform: 'translateY(0) rotate(-5deg)', opacity: 0.85 },
                    '50%': { transform: 'translateY(-8px) rotate(5deg)', opacity: 1 },
                  },
                }}>
                  {emoji}
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: { xs: 17, sm: 19 }, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {tab === 'groups' ? t('noGroups') : t('noLists')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', mb: { xs: 3, sm: 4 }, maxWidth: { xs: 260, sm: 280 } }}>
              {tab === 'groups' ? t('noGroupsDesc') : t('noListsDesc')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => { haptic('medium'); setShowMenu(true); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 3, sm: 3.5 }, py: { xs: 1.4, sm: 1.6 }, fontSize: { xs: 14, sm: 15 }, borderRadius: '14px', boxShadow: '0 6px 20px rgba(20,184,166,0.3)' }}
            >
              <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              <span>{tab === 'groups' ? t('createFirstGroup') : t('createFirstList')}</span>
            </Button>
          </Box>
        ) : (<>
          <Box sx={{ mb: 1, px: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: reorderMode ? 'primary.main' : 'text.secondary' }}>
                {reorderMode ? t('reorderLists') : `${orderedDisplay.length} ${t('listsCount')}`}
              </Typography>
              {orderedDisplay.length > 1 && (
                reorderMode ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleCancelReorder}
                      sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', borderRadius: '10px', px: 1.5, py: 0.5, minWidth: 'auto', color: 'error.main', borderColor: 'error.main', '&:hover': { borderColor: 'error.dark', bgcolor: 'rgba(239,68,68,0.04)' } }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveOrder}
                      disabled={!hasOrderChanges}
                      startIcon={<DoneIcon sx={{ fontSize: 16 }} />}
                      sx={{ fontSize: 12, fontWeight: 700, textTransform: 'none', borderRadius: '10px', px: 1.5, py: 0.5, minWidth: 'auto', gap: 0.75, boxShadow: hasOrderChanges ? '0 2px 8px rgba(20,184,166,0.3)' : 'none' }}
                    >
                      {t('reorderDone')}
                    </Button>
                  </Box>
                ) : (
                  <IconButton
                    size="small"
                    onClick={handleEnterReorder}
                    sx={{ color: 'text.secondary', p: 0.5 }}
                  >
                    <SwapVertIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                )
              )}
            </Box>
            {reorderMode && (
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25 }}>
                {t('reorderHint')}
              </Typography>
            )}
          </Box>
          {orderedDisplay.map((l: List, idx: number) => (
          <Box key={l.id} ref={(el: HTMLDivElement | null) => { cardRefs.current[idx] = el; }}>
            <ListCard
              list={l}
              isMuted={isGroupMuted(l.id)}
              isOwner={l.owner.id === user.id}
              onSelect={onSelectList}
              onEditList={(list) => setEditList({ ...list })}
              onDeleteList={(list) => setConfirmDeleteList(list)}
              onLeaveList={onLeaveList ? (list) => setConfirmLeaveList(list) : undefined}
              onToggleMute={toggleGroupMute}
              t={t}
              reorderMode={reorderMode}
              isDragging={reorderMode && dragIndex === idx}
              isDragOver={reorderMode && dragOverIndex === idx && dragIndex !== idx}
              onDragHandleTouch={reorderMode ? (e: React.TouchEvent) => {
                e.stopPropagation();
                handleDragStart(idx, e.touches[0].clientY);
              } : undefined}
              onDragHandleMouse={reorderMode ? (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                handleDragStart(idx, e.clientY);
              } : undefined}
            />
          </Box>
        ))}
        </>)}
      </Box>

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <>
          {/* רקע מאחור - fade-in/fade-out הדרגתי */}
          <Box
            onClick={closeMenu}
            sx={{
              position: 'fixed', inset: 0,
              bgcolor: 'rgba(0,0,0,0.5)',
              zIndex: 998,
              backdropFilter: 'blur(4px)',
              animation: menuClosing
                ? 'menuBackdropOut 0.28s ease-in forwards'
                : 'menuBackdropIn 0.28s ease-out',
              '@keyframes menuBackdropIn': {
                from: { opacity: 0, backdropFilter: 'blur(0px)' },
                to: { opacity: 1, backdropFilter: 'blur(4px)' },
              },
              '@keyframes menuBackdropOut': {
                from: { opacity: 1, backdropFilter: 'blur(4px)' },
                to: { opacity: 0, backdropFilter: 'blur(0px)' },
              },
            }}
          />
          {/* התפריט - עולה מלמטה ובסגירה יורד חזרה. אנימציה דו-כיוונית */}
          <Box
            sx={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              bgcolor: 'background.paper',
              borderRadius: '24px 24px 0 0',
              p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))',
              zIndex: 999,
              maxWidth: { xs: '100%', sm: 400 },
              mx: 'auto',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
              animation: menuClosing
                ? 'menuSlideDown 0.28s cubic-bezier(0.4, 0, 0.6, 1) forwards'
                : 'menuSlideUp 0.36s cubic-bezier(0.34, 1.32, 0.64, 1)',
              '@keyframes menuSlideUp': {
                from: { transform: 'translateY(100%)', opacity: 0.9 },
                to: { transform: 'translateY(0)', opacity: 1 },
              },
              '@keyframes menuSlideDown': {
                from: { transform: 'translateY(0)', opacity: 1 },
                to: { transform: 'translateY(100%)', opacity: 0.9 },
              },
            }}
          >
            {/* כפתור X צף - חצי-חצי בקצה העליון של התפריט, באותו עיצוב כמו ה-FAB */}
            <Box
              role="button"
              tabIndex={0}
              aria-label="סגור"
              onClick={closeMenu}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeMenu(); }}
              sx={{
                position: 'absolute',
                top: -28,                                  // חצי הגובה של ה-X (56/2)
                left: '50%',
                width: 56, height: 56, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
                boxShadow: [
                  '0 8px 22px rgba(20,184,166,0.5)',
                  '0 3px 8px rgba(0,0,0,0.15)',
                  'inset 0 1px 0 rgba(255,255,255,0.3)',
                ].join(', '),
                // מצב התחלה: + ממורכז. אחרי האנימציה: X (rotate 135°). שמירה על המרכוז.
                transform: 'translateX(-50%) rotate(135deg)',
                animation: 'fabRotateIn 0.42s cubic-bezier(0.34, 1.32, 0.64, 1)',
                '@keyframes fabRotateIn': {
                  from: { transform: 'translateX(-50%) rotate(0deg)' },
                  to: { transform: 'translateX(-50%) rotate(135deg)' },
                },
                '&:active': { opacity: 0.9 },
                '@media (max-width: 360px)': { width: 52, height: 52, top: -26 },
                '@media (max-width: 320px)': { width: 48, height: 48, top: -24 },
              }}
            >
              <AddIcon sx={{
                fontSize: 30,
                color: 'white',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                '@media (max-width: 360px)': { fontSize: 28 },
                '@media (max-width: 320px)': { fontSize: 26 },
              }} />
            </Box>
            <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mb: 1.5 }} />
            {/* ה-X להסגרה הוא ה-FAB עצמו (מסתובב 135° כשהתפריט פתוח) */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4, mt: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>{t('whatToCreate')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {MENU_OPTIONS.map((option) => (
                <Box
                  key={option.id}
                  onClick={() => openOption(option.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    gap: 1.5,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    '&:active': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: option.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {option.icon}
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{t(option.titleKey)}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t(option.descKey)}</Typography>
                  </Box>
                  <ChevronLeftIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Create Private List Modal */}
      {showCreate && (
        <Modal title={t('privateList')} onClose={() => !creatingList && closeCreateModal()}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md }}>{createError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: newL.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 12px ${newL.color}40` }}>
              {newL.icon}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{t('listName')}</Typography>
            <TextField autoFocus fullWidth value={newL.name} onChange={e => updateNewListField('name', e.target.value)} size="small" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {LIST_ICONS.map(i => (
                <Box key={i} onClick={() => updateNewListField('icon', i)} sx={iconSelectSx(newL.icon === i)}>{i}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => updateNewListField('color', c)} sx={{ ...colorSelectSx(newL.color === c), bgcolor: c }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(false)} disabled={creatingList} sx={{ py: 1.25, fontSize: 15 }}>
            {creatingList ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('createList')}
          </Button>
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal title={t('newGroup')} onClose={() => !creatingList && closeCreateGroupModal()}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md }}>{createError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: newL.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 12px ${newL.color}40` }}>
              {newL.icon}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{t('groupName')}</Typography>
            <TextField autoFocus fullWidth value={newL.name} onChange={e => updateNewListField('name', e.target.value)} size="small" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {GROUP_ICONS.map(i => (
                <Box key={i} onClick={() => updateNewListField('icon', i)} sx={iconSelectSx(newL.icon === i)}>{i}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => updateNewListField('color', c)} sx={{ ...colorSelectSx(newL.color === c), bgcolor: c }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(true)} disabled={creatingList} sx={{ py: 1.25, fontSize: 15 }}>
            {creatingList ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('createGroup')}
          </Button>
        </Modal>
      )}

      {/* Join Group Modal */}
      {showJoin && (
        <Modal title={t('joinGroup')} onClose={() => !joiningGroup && closeJoinModal()}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #14B8A6, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              mx: 'auto',
              mb: 1.5,
              boxShadow: '0 6px 16px rgba(20, 184, 166, 0.25)'
            }}>
              <PersonAddIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', lineHeight: 1.5 }}>
              {t('enterCodeAndPasswordHint')}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('groupCode')}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('sixChars')}</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinError(''); }}
              placeholder="_ _ _ _ _ _"
              size="small"
              inputProps={{ maxLength: 6, dir: 'ltr', style: { textAlign: 'left', textTransform: 'uppercase', letterSpacing: 12, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                startAdornment: joinError ? (
                  <InputAdornment position="start">
                    <Box
                      onClick={() => { setJoinCode(''); setJoinError(''); }}
                      sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                    >✕</Box>
                  </InputAdornment>
                ) : joinCode.length === 6 ? (
                  <InputAdornment position="start">
                    <Box sx={{
                      color: 'success.main',
                      fontSize: 18,
                      fontWeight: 700,
                      animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      ...checkmarkPopKeyframes
                    }}>✓</Box>
                  </InputAdornment>
                ) : null
              }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('password')}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('fourDigits')}</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinPass}
              onChange={e => { setJoinPass(e.target.value.replace(/\D/g, '').slice(0, 4)); setJoinError(''); }}
              placeholder="_ _ _ _"
              size="small"
              inputRef={passwordInputRef}
              inputProps={{ maxLength: 4, inputMode: 'numeric', dir: 'ltr', style: { textAlign: 'left', letterSpacing: 16, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                startAdornment: joinError ? (
                  <InputAdornment position="start">
                    <Box
                      onClick={() => { setJoinPass(''); setJoinError(''); }}
                      sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                    >✕</Box>
                  </InputAdornment>
                ) : joinPass.length === 4 ? (
                  <InputAdornment position="start">
                    <Box sx={{
                      color: 'success.main',
                      fontSize: 18,
                      fontWeight: 700,
                      animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      ...checkmarkPopKeyframes
                    }}>✓</Box>
                  </InputAdornment>
                ) : null
              }}
            />
          </Box>

          {/* קישור עדין לסריקת QR - לא כפתור, מרגיש כמו פעולה משנית */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box
              component="button"
              type="button"
              onClick={() => { haptic('light'); setShowQRScanner(true); }}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.6,
                background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.12))',
                border: '1px solid rgba(20,184,166,0.35)', cursor: 'pointer',
                color: '#0D9488',
                fontSize: 12, fontWeight: 600,
                py: 0.6, px: 1.4, borderRadius: '999px',
                boxShadow: '0 1px 3px rgba(20,184,166,0.15)',
                transition: 'color 0.12s, background 0.12s, transform 0.08s',
                '&:hover': { background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(16,185,129,0.2))' },
                '&:active': { opacity: 0.75, transform: 'scale(0.97)' },
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 14 }} />
              הצטרף באמצעות QR
            </Box>
          </Box>

          {joinError && <Alert severity={joinCooldown > 0 ? 'warning' : 'error'} sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>
            {joinCooldown > 0 ? `${joinError} (${joinCooldown}s)` : joinError}
          </Alert>}

          <Button
            variant="contained"
            fullWidth
            onClick={handleJoin}
            disabled={joinCode.length < 6 || joinPass.length < 4 || joiningGroup || joinCooldown > 0}
            sx={{
              py: 1.5,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              '&:disabled': { boxShadow: 'none' }
            }}
          >
            {joiningGroup ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              t('joinGroup')
            )}
          </Button>
        </Modal>
      )}

      {/* Edit List Modal */}
      {editList && <EditListModal
        isOpen
        list={editList}
        editData={editListData}
        hasChanges={editListHasChanges}
        saving={savingList}
        onClose={() => !savingList && setEditList(null)}
        onSave={saveEditList}
        onUpdateData={(data) => {
          if (!editList) return;
          setEditList({ ...editList, ...data });
        }}
        onConvertToGroup={!editList.isGroup ? (password: string) => {
          onEditList({ ...editList, isGroup: true, password });
          setEditList(null);
        } : undefined}
        onConvertToPrivate={editList.isGroup && editList.members.length === 0 ? () => {
          if (isGroupMuted(editList.id)) {
            updateNotifications({ mutedGroupIds: settings.notifications.mutedGroupIds.filter(id => id !== editList.id) });
          }
          onEditList({ ...editList, isGroup: false, password: null });
          setEditList(null);
        } : undefined}
        onChangePassword={editList.isGroup ? (password: string) => {
          onEditList({ ...editList, password });
          setEditList(null);
        } : undefined}
      />}

      {/* Confirm Delete */}
      {confirmDeleteList && (
        <ConfirmModal
          title={confirmDeleteList.isGroup ? t('deleteGroupTitle') : t('deleteListTitle')}
          message={`${t('delete')} "${confirmDeleteList.name}"? ${t('deleteConfirmMessage')}`}
          confirmText={t('delete')}
          onConfirm={deleteList}
          onCancel={() => setConfirmDeleteList(null)}
        />
      )}

      {/* Confirm Leave */}
      {confirmLeaveList && (
        <ConfirmModal
          title={t('leaveGroup')}
          message={`${t('leaveGroupConfirm')}\n"${confirmLeaveList.name}"`}
          confirmText={t('leaveGroup')}
          onConfirm={handleLeaveList}
          onCancel={() => setConfirmLeaveList(null)}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <Modal title={t('notifications')} onClose={() => setShowNotifications(false)}>
          {allNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.06))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                mx: 'auto',
                mb: 2.5,
              }}>
                🔔
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                {t('noNotifications')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {t('noNotificationsYet')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* כותרת */}
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', mb: 1.5, textAlign: 'center', px: 0.5 }}>
                {allNotifications.length}{' '}
                {allNotifications.length === 1 ? t('newNotification') : t('newNotifications')}
              </Typography>

              {/* Notification list */}
              <Box sx={{
                maxHeight: '55vh',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                mx: -0.5,
                px: 0.5,
                pb: 1,
              }}>
                {allNotifications.map((n, index) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    index={index}
                    isDismissing={dismissingNotifications.has(n.id)}
                    onDismiss={handleDismissNotification}
                    onNavigate={(listId) => { setShowNotifications(false); setTimeout(() => navigate(`/list/${listId}`), 300); }}
                  />
                ))}
              </Box>

              {/* כפתור סמן הכל כנקרא */}
              <Box sx={{ pt: 1.5, px: 0.5 }}>
                <Button
                  fullWidth
                  size="small"
                  onClick={handleMarkAllRead}
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#14B8A6',
                    textTransform: 'none',
                    borderRadius: '12px',
                    py: 1,
                    bgcolor: 'rgba(20,184,166,0.06)',
                    border: '1px solid rgba(20,184,166,0.15)',
                    '&:hover': { bgcolor: 'rgba(20,184,166,0.12)' },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  {t('markAllAsRead')}
                </Button>
              </Box>
            </Box>
          )}
        </Modal>
      )}

      {/* Confirm Logout */}
      {confirmLogout && (
        <ConfirmModal title={t('logout')} message={t('logoutConfirm')} confirmText={t('logout')} onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />
      )}

      {/* Push Notification Prompt */}
      {showPushPrompt && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={handleDismissPushPrompt} />
          <Box sx={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 360,
            bgcolor: 'background.paper',
            borderRadius: '20px',
            p: 3,
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '16px', background: pushPromptError ? 'linear-gradient(135deg, #F59E0B, #EAB308)' : 'linear-gradient(135deg, #14B8A6, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, mx: 'auto', mb: 2 }}>
              {pushPromptError ? '⚠️' : '🔔'}
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {pushPromptError ? t('pushNotifBlocked') : t('enableNotifications')}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {pushPromptError ? t('pushNotifBlockedDesc') : t('pushNotifBenefits')}
            </Typography>
            {!pushPromptError && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleEnablePush}
                disabled={pushLoading}
                sx={{ py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px', mb: 1.5 }}
              >
                {pushLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  t('enableNotifications')
                )}
              </Button>
            )}
            <Button
              fullWidth
              onClick={handleDismissPushPrompt}
              sx={{ py: 1, fontSize: 14, color: 'text.secondary' }}
            >
              {pushPromptError ? t('gotIt') : t('notNow')}
            </Button>
          </Box>
        </>
      )}

      <PwaInstallPrompt t={t} />

      {/* סורק QR - קופץ מעל JoinModal, ממלא את הקוד והסיסמה אוטומטית */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(text) => {
          setShowQRScanner(false);
          // הפורמט שאנחנו מייצרים: {origin}/join?code=XXX&password=YYYY
          let code = '';
          let password = '';
          let isOurFormat = false;
          try {
            const url = new URL(text);
            code = (url.searchParams.get('code') || '').toUpperCase();
            password = url.searchParams.get('password') || '';
            // QR שלנו = יש קוד 6 תווים, סיסמה 4 ספרות, כתובת תואמת
            if (code.length === 6 && /^\d{4}$/.test(password)) isOurFormat = true;
          } catch {
            const match = text.trim().match(/^([A-Z0-9]{6})[:\s]*(\d{4})?$/i);
            if (match) {
              code = match[1].toUpperCase();
              password = match[2] || '';
              if (code.length === 6 && /^\d{4}$/.test(password)) isOurFormat = true;
            }
          }
          if (isOurFormat) {
            setJoinCode(code);
            setJoinPass(password);
            setJoinError('');
          } else if (code.length === 6) {
            // קוד נראה תקין אבל סיסמה חסרה/לא תואמת
            setJoinCode(code);
            setJoinError('הקוד זוהה אך הסיסמה חסרה או לא תקפה. הזינו סיסמה ידנית.');
          } else {
            // לא QR שלנו
            setJoinError('זה לא QR להצטרפות לקבוצה. סרקו את ה-QR שקיבלתם מהמזמין.');
          }
        }}
      />
    </Box>

      {/* ===== Bottom Navigation =====
          קבוע בתחתית, נעול לחלוטין. ללא wrapper מקיף שיגרום לבעיות
          (transform/willChange/filter/backdrop-filter/perspective על אב יוצרים
          containing block חדש וגורמים ל-position:fixed להתנהג כ-absolute).
          padding-bottom: env(safe-area-inset-bottom) מעל ה-home indicator של iPhone.
          mask-image חותך אליפסה במרכז העליון — שם יושב ה-FAB ומסביבו רווח שקוף. */}
      {!showMenu && !showJoin && !showCreate && !showCreateGroup && (
      <Box
        sx={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 1000,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          pb: 'env(safe-area-inset-bottom)',
          boxShadow: isDark
            ? '0 -8px 24px rgba(0,0,0,0.4), 0 -2px 6px rgba(0,0,0,0.25)'
            : '0 -8px 24px rgba(0,0,0,0.08), 0 -2px 6px rgba(0,0,0,0.04)',
          // חתך עגול במרכז העליון של הבר - 36px רדיוס. ה-FAB (28px רדיוס)
          // יושב בתוך החתך עם 8px רווח שקוף סביבו (אפקט floating).
          WebkitMaskImage: 'radial-gradient(circle 43px at 50% 0%, transparent 42px, black 43px)',
          maskImage: 'radial-gradient(circle 43px at 50% 0%, transparent 42px, black 43px)',
          // overscroll-behavior מונע מ-pull-to-refresh ב-iOS להזיז את הבר.
          overscrollBehavior: 'contain',
          touchAction: 'manipulation',
        }}
      >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 500, md: 600 },
          mx: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          py: { xs: 0.5, sm: 0.75 },
          px: { xs: 2.5, sm: 3.5 },
          minHeight: 52,
          '@media (max-width: 360px)': { py: 0.4, px: 2, minHeight: 48 },
          '@media (max-width: 320px)': { py: 0.3, px: 1.5, minHeight: 44 },
        }}
      >
        {/* ימין (RTL = ראשון ב-DOM) - בית. במצב פעיל מקבל רקע כדוריוסי
            וקו עליון בולט, כמו בעיצוב המוצג. */}
        <Box
          role="button"
          tabIndex={0}
          onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('home')}
          sx={{
            position: 'relative',
            flex: 1, maxWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0.3,
            minHeight: 40,
            py: 0.35,
            borderRadius: '12px',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            // רקע מסמן את הטאב כפעיל - כמו במסך הראשי באפליקציות מובייל
            bgcolor: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.12)',
            transition: 'background-color 0.18s ease',
            '&:hover': { bgcolor: isDark ? 'rgba(20,184,166,0.22)' : 'rgba(20,184,166,0.16)' },
            '&:active': { opacity: 0.7 },
            // הרקע הטורקיז העדין מספיק כדי לסמן שזה הטאב הפעיל - בלי קו עליון
          }}
        >
          <HomeIcon sx={{ fontSize: 24, color: '#0D9488' }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.2, lineHeight: 1 }}>
            {t('home')}
          </Typography>
        </Box>

        {/* ה-FAB מורם החוצה כאחיו של הפס - ראה למעלה. כאן רק spacer לשמור
            על מקום במרכז כדי שהטאבים יישארו על הצדדים ולא יתקרבו למרכז */}
        <Box sx={{ width: 64, flexShrink: 0, '@media (max-width: 360px)': { width: 58 }, '@media (max-width: 320px)': { width: 52 } }} />

        {/* שמאל (RTL = אחרון ב-DOM) - תובנות. סגנון אחיד מדויק לימין */}
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); navigate('/insights'); }}
          aria-label={t('insights')}
          sx={{
            flex: 1, maxWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0.3,
            minHeight: 40,
            py: 0.35,
            borderRadius: '10px',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.18s ease, transform 0.1s ease',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,184,166,0.05)' },
            '&:active': { opacity: 0.7 },
          }}
        >
          <InsightsOutlinedIcon sx={{ fontSize: 24, color: 'text.primary', opacity: 0.75 }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.primary', opacity: 0.75, letterSpacing: 0.2, lineHeight: 1 }}>
            {t('insights')}
          </Typography>
        </Box>
      </Box>
      </Box>
      )}

      {/* ===== FAB (כפתור +) =====
          ממורכז אופקית. נמצא חצי בתוך חתך הבר וחצי מעליו - אפקט "צף בתוך החתך".
          רדיוס FAB 28px, רדיוס חתך הבר 36px → 8px רווח שקוף שמראה את התוכן.
          ללא border, רק gradient + shadow רב-שכבתי. */}
      {!showMenu && !showJoin && !showCreate && !showCreateGroup && (
      <Box
        sx={{
          position: 'fixed',
          // bottom: safe-area + (גובה בר 64 - חצי FAB 28) = safe-area + 36
          // → מרכז ה-FAB יושב בדיוק על הקצה העליון של הבר. חצי מעל, חצי בתוך החתך.
          bottom: 'calc(env(safe-area-inset-bottom) + 36px)',
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          zIndex: 1100,
          pointerEvents: 'none',                      // wrapper שקוף לאירועים
          '& > *': { pointerEvents: 'auto' },         // הכפתור עצמו כן לחיץ
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('new')}
          onClick={() => { haptic('medium'); setShowMenu(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('medium'); setShowMenu(true); } }}
          sx={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
            // ללא border. רק shadow + inset highlight עליון.
            border: 'none',
            boxShadow: [
              '0 10px 28px rgba(20,184,166,0.5)',
              '0 4px 10px rgba(0,0,0,0.18)',
              'inset 0 1px 0 rgba(255,255,255,0.3)',
            ].join(', '),
            transition: 'box-shadow 0.18s, transform 0.12s',
            '&:hover': {
              boxShadow: '0 14px 34px rgba(20,184,166,0.6), 0 6px 14px rgba(0,0,0,0.2)',
            },
            '&:active': { transform: 'scale(0.96)' },
            '@media (max-width: 360px)': { width: 52, height: 52 },
            '@media (max-width: 320px)': { width: 48, height: 48 },
          }}
        >
          <AddIcon sx={{
            fontSize: 30, color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            '@media (max-width: 360px)': { fontSize: 28 },
          }} />
        </Box>
      </Box>
      )}
    </>
  );
});

HomeComponent.displayName = 'HomeComponent';
