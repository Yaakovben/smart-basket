import { useMemo, type RefObject } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import DoneIcon from '@mui/icons-material/Done';
import type { List, User } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { ShimmerBlock } from '../../../global/components';
import { useConnectionStatus } from '../../../global/hooks/useConnectionStatus';
import type { HomeTab } from '../types/home-types';
import { ListCard } from './ListCard';

interface HomeListContentProps {
  contentRef: RefObject<HTMLDivElement | null>;
  listsFetchError: boolean;
  hasAnyLists: boolean;
  hasSearchQuery: boolean;
  listsLoading: boolean;
  tab: HomeTab;
  isDark: boolean;
  orderedDisplay: List[];
  user: User;
  isGroupMuted: (listId: string) => boolean;
  onToggleMute: (listId: string) => void;
  onSelectList: (list: List) => void;
  onEditList: (list: List) => void;
  onDeleteList: (list: List) => void;
  onLeaveList?: (list: List) => void;
  reorderMode: boolean;
  dragIndex: number;
  dragOverIndex: number;
  cardRefs: RefObject<(HTMLDivElement | null)[]>;
  hasOrderChanges: boolean;
  onCancelReorder: () => void;
  onSaveOrder: () => void;
  onEnterReorder: () => void;
  onDragHandleStart: (index: number, clientY: number, clientX?: number) => void;
  t: (key: TranslationKeys) => string;
}

// אזור התוכן של מסך הבית: מצב שגיאת חיבור / סקלטון טעינה / ריק / רשימת כרטיסים עם סידור-מחדש.
export const HomeListContent = ({
  contentRef, listsFetchError, hasAnyLists, hasSearchQuery, listsLoading, tab, isDark, orderedDisplay, user,
  isGroupMuted, onToggleMute, onSelectList, onEditList, onDeleteList, onLeaveList,
  reorderMode, dragIndex, dragOverIndex, cardRefs, hasOrderChanges,
  onCancelReorder, onSaveOrder, onEnterReorder, onDragHandleStart, t,
}: HomeListContentProps) => {
  // מבדיל בין "אין אינטרנט אצל הלקוח" (offline מאומת) ל"החיבור נקטע רגעית /
  // הבקשה נכשלה" - כדי לא לרמוז שהתקלה בשרת שלנו כשהמכשיר פשוט לא מחובר.
  const { phase } = useConnectionStatus();
  const isDeviceOffline = phase === 'offline';
  // ידיות גרירה יציבות לפי אינדקס - נמנע מיצירת פונקציה חדשה בכל רינדור
  // (שהייתה מבטלת את ה-React.memo של ListCard לכל הכרטיסים בכל תזוזת גרירה,
  // לא רק לכרטיס שבאמת זז).
  const dragHandlers = useMemo(() => {
    if (!reorderMode) return [];
    return orderedDisplay.map((_, idx) => ({
      touch: (e: React.TouchEvent) => {
        e.stopPropagation();
        onDragHandleStart(idx, e.touches[0].clientY, e.touches[0].clientX);
      },
      mouse: (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDragHandleStart(idx, e.clientY, e.clientX);
      },
    }));
  }, [reorderMode, orderedDisplay, onDragHandleStart]);

  return (
    <Box ref={contentRef} sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', p: { xs: 2, sm: 2.5 }, pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 'calc(70px + env(safe-area-inset-bottom))' }, WebkitOverflowScrolling: 'touch' }}>
      {/* מצב "אין רשימות + הבקשה נכשלה". הקוד מנסה שוב אוטומטית כל 4 שניות
          (useLists effect) - ברגע שהחיבור חוזר הרשימות מופיעות מעצמן, אין
          צורך בלחיצה ידנית. הכרטיס מנוסח רגוע ולא מבהיל, ומבדיל בין מכשיר
          ללא אינטרנט (isDeviceOffline) לבין בקשה שנכשלה כשיש חיבור - בלי
          לרמוז שהתקלה בשרת שלנו. */}
      {listsFetchError && !hasAnyLists ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh', p: { xs: 3, sm: 4 } }}>
          <Box sx={{
            width: '100%', maxWidth: 340,
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            p: { xs: 3, sm: 3.5 },
            borderRadius: '20px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.05)',
          }}>
            <Box sx={{
              width: { xs: 72, sm: 80 }, height: { xs: 72, sm: 80 }, borderRadius: '50%',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mb: 2,
              animation: 'connBreath 2.4s ease-in-out infinite',
              '@keyframes connBreath': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.9 },
                '50%': { transform: 'scale(1.06)', opacity: 1 },
              },
            }}>
              {isDeviceOffline
                ? <WifiOffRoundedIcon sx={{ fontSize: { xs: 34, sm: 38 }, color: 'text.secondary' }} />
                : <CloudOffIcon sx={{ fontSize: { xs: 34, sm: 38 }, color: 'text.secondary' }} />}
            </Box>
            <Typography sx={{ fontSize: { xs: 16, sm: 17 }, fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
              {isDeviceOffline ? t('offlineTitle') : t('loadRetryTitle')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, color: 'text.secondary', lineHeight: 1.5, mb: 2.25 }}>
              {isDeviceOffline ? t('offlineDesc') : t('loadRetryDesc')}
            </Typography>
            {/* חיווי "מנסה שוב" - שקוף ומשולב בכרטיס, לא צ'יפ נפרד זועק */}
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.9, mb: 1.5 }}>
              <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                {[0, 1, 2].map(i => (
                  <Box key={i} sx={{
                    width: 5, height: 5, borderRadius: '50%',
                    bgcolor: 'primary.main',
                    animation: 'connDot 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.18}s`,
                    '@keyframes connDot': {
                      '0%, 100%': { opacity: 0.25, transform: 'scale(0.8)' },
                      '50%': { opacity: 1, transform: 'scale(1)' },
                    },
                  }} />
                ))}
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'primary.main' }}>
                {t('retrying')}
              </Typography>
            </Box>
            <Button
              variant="text"
              onClick={() => window.location.reload()}
              sx={{
                fontSize: 12, fontWeight: 600, color: 'text.secondary',
                textTransform: 'none', borderRadius: '10px', px: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {t('reloadPageAction')}
            </Button>
          </Box>
        </Box>
      ) : listsLoading && orderedDisplay.length === 0 ? (
        // סקלטון בצורת כרטיסי רשימות - נותן ללקוח תחושה שמשהו טוען וכבר תופס
        // את המקום שהרשימות יתפסו, במקום מסך ריק לבן.
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: { xs: 1.5, sm: 2.5 }, pt: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 2, borderRadius: '16px',
              bgcolor: 'background.paper',
              border: '1px solid', borderColor: 'divider',
              minHeight: 80,
            }}>
              <ShimmerBlock width={52} height={52} radius={14} />
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ShimmerBlock width="65%" height={18} radius={8} />
                <ShimmerBlock width="40%" height={14} radius={7} />
              </Box>
              <ShimmerBlock width={28} height={28} radius={8} />
            </Box>
          ))}
        </Box>
      ) : orderedDisplay.length === 0 && hasSearchQuery ? (
        // חיפוש בלי תוצאות - שונה מ"אין רשימות בכלל" (יש רשימות, פשוט לא
        // תואמות את החיפוש). אותו דפוס אנימציה בדיוק כמו חיפוש מוצר בתוך
        // רשימה (EmptyState.tsx בפיצ'ר הרשימה - pulseRing/floatMain/floatItem,
        // גרדיאנט ענבר, 4 אייקונים מרחפים) אבל עם טקסט מותאם לחיפוש רשימות.
        <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '45vh' }}>
          <Box sx={{ position: 'relative', width: 130, height: 130, mb: { xs: 1.75, sm: 2 } }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: isDark ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))' : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              animation: 'pulseRing 3s ease-in-out infinite',
              '@keyframes pulseRing': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
              },
            }} />
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 52,
              animation: 'floatMain 3s ease-in-out infinite',
              '@keyframes floatMain': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-6px)' },
              },
            }}>
              🔍
            </Box>
            {['❓', '🔎', '💭', '✨'].map((emoji, i) => (
              <Box key={i} sx={{
                position: 'absolute', fontSize: 18,
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
          <Typography sx={{ fontSize: { xs: 16, sm: 17 }, fontWeight: 700, color: 'text.primary', mb: 1 }}>
            {t('noListSearchResults')}
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', maxWidth: { xs: 260, sm: 280 } }}>
            {t('noListSearchResultsDesc')}
          </Typography>
        </Box>
      ) : orderedDisplay.length === 0 ? (
        // ממלא את כל הגובה כדי שהאייקון יהיה במרכז אנכי במסך, לא מעל באמצע
        <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
          {/* דמות ידידותית - אייקון מרכזי שצף + פריטים מרחפים סביב לתחושת חיים */}
          <Box sx={{ position: 'relative', width: 180, height: 180, mb: { xs: 2, sm: 2.5 } }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: tab === 'groups'
                ? 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.06))'
                : 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(13,148,136,0.06))',
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
          {/* כפתור CTA הוסר - ה-FAB+ בתחתית מבצע את אותה פעולה. */}
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
                    onClick={onCancelReorder}
                    sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', borderRadius: '10px', px: 1.5, py: 0.5, minWidth: 'auto', color: 'error.main', borderColor: 'error.main', '&:hover': { borderColor: 'error.dark', bgcolor: 'rgba(239,68,68,0.04)' } }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onSaveOrder}
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
                  onClick={onEnterReorder}
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
            onEditList={onEditList}
            onDeleteList={onDeleteList}
            onLeaveList={onLeaveList}
            onToggleMute={onToggleMute}
            t={t}
            reorderMode={reorderMode}
            isDragging={reorderMode && dragIndex === idx}
            isDragOver={reorderMode && dragOverIndex === idx && dragIndex !== idx}
            onDragHandleTouch={dragHandlers[idx]?.touch}
            onDragHandleMouse={dragHandlers[idx]?.mouse}
          />
        </Box>
      ))}
      </>)}
    </Box>
  );
};
