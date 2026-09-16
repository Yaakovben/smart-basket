import { memo, useRef, useCallback } from 'react';
import { Box, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import type { FabPosition } from '../types/list-types';

// ===== קבועים =====
const FAB_DRAGGABLE_THRESHOLD = 3;
// חלון דדופ - מונע פתיחה כפולה כשגם touchend וגם click (סינתטי או אמיתי)
// מגיעים מאותה הקשה.
const SAME_TAP_MS = 600;

// ===== Props =====
interface AddProductFabProps {
  itemCount: number;
  fabPosition: FabPosition | null;
  isDragging: boolean;
  // false בזמן גלילה למטה ברשימה ארוכה - הכפתור פשוט מסתיר מוצרים. תמיד
  // true בזמן גרירה בפועל (isDragging), גם אם הוחבא רגע לפני כן.
  visible: boolean;
  onAddProduct: () => void;
  onDragStart: (clientX: number, clientY: number, currentCenterX?: number, currentCenterY?: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
}

// אנימציית הופעה/הסתרה - קפיצה עדינה (לא רק fade שטוח) עם overshoot קל
// שמתאים לשפה העיצובית של האפליקציה (אותו סוג עקומה כמו כרטיסי רשימה).
const VISIBILITY_TRANSITION = 'opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1)';

// ===== קומפוננטה =====
export const AddProductFab = memo(({
  itemCount,
  fabPosition,
  isDragging,
  visible,
  onAddProduct,
  onDragStart,
  onDragMove,
  onDragEnd
}: AddProductFabProps) => {
  const { t } = useSettings();
  const isDraggable = itemCount > FAB_DRAGGABLE_THRESHOLD;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  // מדידת מרכז הכפתור בפועל לפי DOM - מונע קפיצה כשמתחילים לגרור מ-bottom-center למצב top/left
  const measureCenter = (): { x: number; y: number } | undefined => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // פתיחה אחת בדיוק להקשה, עם guard. isDragging נבדק ע"י הקוראים.
  const fireAdd = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < SAME_TAP_MS) return;
    lastTapRef.current = now;
    haptic('medium');
    onAddProduct();
  }, [onAddProduct]);

  // הקשה במגע: מטופלת ב-touchend + preventDefault. זה חוסם את ה"קליק
  // הרפאים" שהדפדפן מסנתז ~300ms אחרי touchend - בלעדיו, אם האצבע נגעה
  // קרוב לשפת הכפתור, הקליק הסינתטי נופל על שורת המוצר שמתחת ל-FAB
  // ו"פותח" אותה במקום. onClick נשאר לעכבר/מקלדת בלבד.
  const onFabTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDragging) return;         // סוף גרירה - לא הקשה
    e.preventDefault();             // אין קליק סינתטי, אין דליפה למוצר שמתחת
    fireAdd();
  }, [isDragging, fireAdd]);

  const onFabClick = useCallback(() => {
    if (isDragging) return;
    fireAdd();
  }, [isDragging, fireAdd]);

  // מצב FAB עגול עם גרירה
  if (isDraggable) {
    return (
      <Box
        ref={wrapperRef}
        sx={{
          position: 'fixed',
          ...(fabPosition ? {
            top: fabPosition.y - 28,
            left: fabPosition.x - 28,
          } : {
            bottom: 'calc(var(--nav-bottom, 0px) + 24px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }),
          zIndex: 5,
          touchAction: 'none',
          '& > *': { pointerEvents: visible ? 'auto' : 'none' },
        }}
        onTouchStart={(e) => { const c = measureCenter(); onDragStart(e.touches[0].clientX, e.touches[0].clientY, c?.x, c?.y); }}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        onMouseDown={(e) => { const c = measureCenter(); onDragStart(e.clientX, e.clientY, c?.x, c?.y); }}
        onMouseMove={isDragging ? (e) => onDragMove(e.clientX, e.clientY) : undefined}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        <Fab
          color="primary"
          onTouchEnd={onFabTouchEnd}
          onClick={onFabClick}
          aria-label={t('addProduct')}
          sx={{
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : `all 0.2s ease, ${VISIBILITY_TRANSITION}`,
            width: { xs: 52, sm: 56 },
            height: { xs: 52, sm: 56 },
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(28px)',
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </Fab>
      </Box>
    );
  }

  // מצב כפתור רגיל - fixed, ממורכז, לא מגיב לנגיעה על ה-wrapper.
  // bottom כולל var(--nav-bottom) כדי שלא ייחתך/יוסתר מאחורי סרגל הדפדפן ב-iOS.
  return (
    <Box sx={{
      position: 'fixed',
      bottom: 'calc(var(--nav-bottom, 0px) + 20px + env(safe-area-inset-bottom))',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 5,
      pointerEvents: 'none',
    }}>
      <Fab
        color="primary"
        variant="extended"
        onTouchEnd={onFabTouchEnd}
        onClick={onFabClick}
        aria-label={t('addProduct')}
        sx={{
          px: 2.5,
          gap: 0.75,
          fontWeight: 600,
          fontSize: 14,
          textTransform: 'none',
          boxShadow: '0 6px 20px rgba(20, 184, 166, 0.4)',
          pointerEvents: visible ? 'auto' : 'none',
          touchAction: 'manipulation',
          transition: VISIBILITY_TRANSITION,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(28px)',
        }}
      >
        <AddIcon sx={{ fontSize: 20 }} />
        {t('addProduct')}
      </Fab>
    </Box>
  );
});

AddProductFab.displayName = 'AddProductFab';
