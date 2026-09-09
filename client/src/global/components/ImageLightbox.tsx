import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { haptic } from '../helpers';
import { useSettings } from '../context/SettingsContext';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

interface Transform { scale: number; tx: number; ty: number }
const IDENTITY: Transform = { scale: 1, tx: 0, ty: 0 };

// מציג תמונה בודדת במסך מלא מעל שאר האפליקציה, עם זום ותזוזה:
//   - צביטה (pinch) / גלגלת עכבר -> זום
//   - הקשה כפולה / דאבל-קליק -> החלפה בין 1x ל-2.5x סביב נקודת ההקשה
//   - גרירה כשמוגדל -> הזזה (pan), עם הגבלה שהתמונה לא בורחת מהמסך
// הקשה על הרקע: כשמוגדל -> חזרה ל-1x; אחרת -> סגירה.
// לא Dialog של MUI בכוונה - נפתח מעל מודאלים קיימים בלי להתנגש ב-z-index.
export const ImageLightbox = ({ src, alt, onClose }: ImageLightboxProps) => {
  const { t } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [gesturing, setGesturing] = useState(false);
  const zoomed = transform.scale > 1.01;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const close = () => { haptic('light'); onClose(); };

  // מגביל tx/ty כך שהתמונה המוגדלת לא נגררת אל מחוץ למסך יותר מדי.
  const clamp = useCallback((tr: Transform): Transform => {
    const img = imgRef.current;
    const cont = containerRef.current;
    if (!img || !cont) return tr;
    const maxX = Math.max(0, (img.offsetWidth * tr.scale - cont.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * tr.scale - cont.clientHeight) / 2);
    return {
      scale: tr.scale,
      tx: Math.min(maxX, Math.max(-maxX, tr.tx)),
      ty: Math.min(maxY, Math.max(-maxY, tr.ty)),
    };
  }, []);

  // זום ל-scale נתון סביב נקודה (px,py ביחס למרכז ה-container).
  const zoomTo = useCallback((nextScale: number, px: number, py: number) => {
    setTransform((prev) => {
      const s = Math.min(MAX_SCALE, Math.max(1, nextScale));
      if (Math.abs(s - prev.scale) < 0.001) return prev;
      if (s === 1) return IDENTITY;
      const ratio = s / prev.scale;
      return clamp({ scale: s, tx: px - (px - prev.tx) * ratio, ty: py - (py - prev.ty) * ratio });
    });
  }, [clamp]);

  const relToCenter = (clientX: number, clientY: number) => {
    const cont = containerRef.current;
    if (!cont) return { x: 0, y: 0 };
    const r = cont.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  };

  // ===== מגע =====
  const g = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startX: 0, startY: 0, startTx: 0, startTy: 0,
    startDist: 0, startScale: 1, midX: 0, midY: 0, lastTap: 0,
  });

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const mid = relToCenter((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      g.current = {
        ...g.current, mode: 'pinch',
        startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startScale: transform.scale, midX: mid.x, midY: mid.y,
      };
      setGesturing(true);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - g.current.lastTap < DOUBLE_TAP_MS) {
        const p = relToCenter(e.touches[0].clientX, e.touches[0].clientY);
        zoomTo(zoomed ? 1 : DOUBLE_TAP_SCALE, p.x, p.y);
        haptic('light');
        g.current.lastTap = 0;
        g.current.mode = 'none';
        return;
      }
      g.current.lastTap = now;
      g.current.mode = zoomed ? 'pan' : 'none';
      g.current.startX = e.touches[0].clientX;
      g.current.startY = e.touches[0].clientY;
      g.current.startTx = transform.tx;
      g.current.startTy = transform.ty;
      if (zoomed) setGesturing(true);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const cur = g.current;
    if (cur.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      zoomTo(cur.startScale * (dist / cur.startDist), cur.midX, cur.midY);
    } else if (cur.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - cur.startX;
      const dy = e.touches[0].clientY - cur.startY;
      setTransform((prev) => clamp({ scale: prev.scale, tx: cur.startTx + dx, ty: cur.startTy + dy }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      g.current.mode = 'none';
      setGesturing(false);
      setTransform((prev) => (prev.scale <= 1.01 ? IDENTITY : prev));
    }
  };

  // ===== עכבר / גלגלת (דסקטופ) =====
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const p = relToCenter(e.clientX, e.clientY);
    setTransform((prev) => {
      const s = Math.min(MAX_SCALE, Math.max(1, prev.scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
      if (s === 1) return IDENTITY;
      const ratio = s / prev.scale;
      return clamp({ scale: s, tx: p.x - (p.x - prev.tx) * ratio, ty: p.y - (p.y - prev.ty) * ratio });
    });
  };

  const mousePan = useRef({ active: false, x: 0, y: 0, tx: 0, ty: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    mousePan.current = { active: true, x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
    setGesturing(true);
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const m = mousePan.current;
      if (!m.active) return;
      setTransform((prev) => clamp({ scale: prev.scale, tx: m.tx + (e.clientX - m.x), ty: m.ty + (e.clientY - m.y) }));
    };
    const up = () => {
      if (mousePan.current.active) { mousePan.current.active = false; setGesturing(false); }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [clamp]);

  const onBackgroundClick = () => {
    if (zoomed) setTransform(IDENTITY);
    else close();
  };

  // portal ל-body: המודאלים של MUI משאירים transform inline על ה-Paper אחרי
  // אנימציית הכניסה, מה שהופך position:fixed לביחס ל-Paper ולא ל-viewport.
  return createPortal(
    <Box
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      onClick={onBackgroundClick}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={(e) => {
        const p = relToCenter(e.clientX, e.clientY);
        zoomTo(zoomed ? 1 : DOUBLE_TAP_SCALE, p.x, p.y);
      }}
      sx={{
        position: 'fixed', inset: 0, zIndex: 2000,
        bgcolor: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        p: 2, overflow: 'hidden',
        touchAction: 'none',
        animation: 'lightboxIn 0.15s ease-out',
        '@keyframes lightboxIn': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <IconButton
        onClick={(e) => { e.stopPropagation(); close(); }}
        aria-label={t('closePhotoAria')}
        sx={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top) + 8px)', insetInlineEnd: 8,
          zIndex: 1,
          bgcolor: 'rgba(255,255,255,0.14)', color: '#fff',
          width: 44, height: 44,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.24)' },
        }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        component="img"
        ref={imgRef}
        src={src}
        alt={alt || t('photo')}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onMouseDown}
        sx={{
          maxWidth: '100%', maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          transition: gesturing ? 'none' : 'transform 0.2s ease-out',
          cursor: zoomed ? 'grab' : 'zoom-in',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      />
    </Box>,
    document.body,
  );
};
