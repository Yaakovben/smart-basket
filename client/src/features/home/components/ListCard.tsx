import { useRef, useState, useCallback, memo } from 'react';
import { Box, Typography, Card, Chip, IconButton } from '@mui/material';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { List, Product } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { ListMenu } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';

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

export const ListCard = memo(({ list: l, isMuted, isOwner, onSelect, onEditList, onDeleteList, onLeaveList, onToggleMute, t, reorderMode, isDragging, isDragOver, onDragHandleTouch, onDragHandleMouse }: ListCardProps) => {
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

  // לחיצה ארוכה על שם הרשימה - מריץ את השם כסרט אם הוא חתוך. לחיצה
  // רגילה ממשיכה לפתוח את הרשימה כרגיל. אם השם נכנס במלואו - לא קורה
  // כלום, כדי לא לבזבז אנימציה על שמות קצרים.
  const [marquee, setMarquee] = useState(false);
  const [marqueeDx, setMarqueeDx] = useState(0);
  const nameWrapRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLSpanElement>(null);
  const pressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const startNamePress = useCallback((e: React.PointerEvent) => {
    if (reorderMode || marquee) return;
    // מונע סימון טקסט וה-callout של iOS בלחיצה ארוכה
    if (e.pointerType === 'touch') e.preventDefault();
    pressTimerRef.current = window.setTimeout(() => {
      const wrap = nameWrapRef.current;
      const text = nameTextRef.current;
      if (!wrap || !text) return;
      const overflow = text.scrollWidth - wrap.clientWidth;
      if (overflow <= 0) return;
      // ב-RTL הטקסט גולש שמאלה, אז כדי לחשוף אותו צריך לזוז ימינה (חיובי).
      // ב-LTR גולש ימינה, צריך לזוז שמאלה (שלילי).
      const isRtl = getComputedStyle(wrap).direction === 'rtl';
      longPressedRef.current = true;
      setMarqueeDx(isRtl ? overflow : -overflow);
      setMarquee(true);
      haptic('light');
    }, 500);
  }, [reorderMode, marquee]);

  const cancelNamePress = useCallback(() => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const onNameClick = useCallback((e: React.MouseEvent) => {
    // אחרי לחיצה ארוכה - מבטלים את הקליק כדי שהרשימה לא תיפתח בטעות
    if (longPressedRef.current) {
      e.stopPropagation();
      longPressedRef.current = false;
    }
  }, []);

  return (
    <Card sx={{
      display: 'flex', alignItems: 'center', gap: 1.75, p: 2, mb: 1,
      cursor: reorderMode ? (isDragging ? 'grabbing' : 'default') : 'pointer',
      transition: isDragging ? 'box-shadow 0.15s' : 'all 0.2s ease',
      transform: isDragging ? 'scale(1.03)' : isDragOver ? 'translateY(4px)' : 'none',
      opacity: isDragging ? 0.95 : 1,
      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : isDragOver ? '0 -3px 0 0 #14B8A6' : undefined,
      position: 'relative',
      zIndex: isDragging ? 10 : 'auto',
      bgcolor: isDragging ? 'action.hover' : undefined,
      userSelect: reorderMode ? 'none' : 'auto',
      WebkitUserSelect: reorderMode ? 'none' : 'auto',
      // touchAction נשאר 'auto' גם במצב סידור - הגלילה מופסקת רק אחרי שה-drag
      // מופעל בפועל (ב-useListReorder, דרך preventDefault). ככה גלילה טבעית
      // ממשיכה לעבוד כל עוד המשתמש לא החזיק לחוץ מספיק זמן.
    }}
      onClick={handleClick}
    >
      {reorderMode && (
        // ידית גרירה - מקבלת את אירועי המגע/עכבר כדי לא להפריע לגלילה
        // בשאר הכרטיס. אנימציית "pulse" מסמנת למשתמש "לחץ ממושך לגרירה"
        <Box
          onTouchStart={onDragHandleTouch}
          onMouseDown={onDragHandleMouse}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, p: 0.75, mx: -0.5, borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            // אנימציית פעימה עדינה - מרמזת "לחץ ממושך"
            animation: isDragging ? 'none' : 'dragHandlePulse 2.2s ease-in-out infinite',
            '@keyframes dragHandlePulse': {
              '0%, 100%': { opacity: 0.45, transform: 'scale(1)' },
              '50%':      { opacity: 0.75, transform: 'scale(1.12)' },
            },
            '&:active': { animation: 'none', transform: 'scale(0.92)' },
          }}
        >
          <DragIndicatorIcon sx={{
            color: isDragging ? 'primary.main' : 'text.disabled',
            fontSize: isDragging ? 24 : 22,
            transition: 'color 0.15s, font-size 0.15s',
          }} />
        </Box>
      )}
      <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, position: 'relative' }}>
        {l.icon}
        {l.isPermanent && (
          <Box
            title={t('permanentList')}
            sx={{
              position: 'absolute', top: -5, insetInlineEnd: -5,
              width: 18, height: 18, borderRadius: '50%',
              bgcolor: '#8B5CF6', border: '2px solid', borderColor: 'background.paper',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PushPinRoundedIcon sx={{ fontSize: 10, color: 'white' }} />
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box
            ref={nameWrapRef}
            onPointerDown={startNamePress}
            onPointerUp={cancelNamePress}
            onPointerLeave={cancelNamePress}
            onPointerCancel={cancelNamePress}
            onClick={onNameClick}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
              flex: 1, minWidth: 0, overflow: 'hidden',
              userSelect: 'none !important',
              WebkitUserSelect: 'none !important',
              WebkitTouchCallout: 'none',
              touchAction: 'manipulation',
              '& *': {
                userSelect: 'none !important',
                WebkitUserSelect: 'none !important',
              },
            }}
          >
            <Typography
              ref={nameTextRef}
              component="span"
              onAnimationEnd={() => { setMarquee(false); setMarqueeDx(0); }}
              sx={{
                fontSize: 16, fontWeight: 600, lineHeight: 1.25,
                display: 'inline-block',
                whiteSpace: 'nowrap',
                maxWidth: marquee ? 'none' : '100%',
                overflow: marquee ? 'visible' : 'hidden',
                textOverflow: marquee ? 'clip' : 'ellipsis',
                userSelect: 'none', WebkitUserSelect: 'none',
                ...(marquee && {
                  animation: `marqueeScroll ${Math.max(2400, Math.abs(marqueeDx) * 28)}ms ease-in-out forwards`,
                  '@keyframes marqueeScroll': {
                    '0%':   { transform: 'translateX(0)' },
                    '12%':  { transform: 'translateX(0)' },
                    '50%':  { transform: `translateX(${marqueeDx}px)` },
                    '62%':  { transform: `translateX(${marqueeDx}px)` },
                    '100%': { transform: 'translateX(0)' },
                  },
                }),
              }}
            >
              {l.name}
            </Typography>
          </Box>
          <Chip
            label={l.isGroup ? t('group') : t('private')}
            size="small"
            sx={{
              bgcolor: l.isGroup ? (isDark ? 'rgba(20,184,166,0.15)' : '#CCFBF1') : (isDark ? 'rgba(3,105,161,0.15)' : '#E0F2FE'),
              color: l.isGroup ? (isDark ? '#5EEAD4' : '#0D9488') : (isDark ? '#7DD3FC' : '#0369A1'),
              height: 22, flexShrink: 0,
              fontWeight: 700, fontSize: 11,
              '& .MuiChip-icon': { marginInlineStart: '4px', marginInlineEnd: '-2px' },
            }}
          />
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
