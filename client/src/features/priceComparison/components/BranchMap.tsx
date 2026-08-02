/**
 * BranchMap — מפה אינטראקטיבית לסניפי רשתות שיווק.
 *
 * מאפשרת:
 * - הצגת כל הסניפים על מפה OpenStreetMap
 * - מיקום נוכחי עם כפתור ייעודי (לא חופף פקדי zoom)
 * - מרקרים צבעוניים לפי רשת עם popup מידע
 * - חץ חזרה (לא X) - עקבי עם שאר האפליקציה
 * - עיצוב מודרני ונקי
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Dialog, Box, Typography, IconButton, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { PriceChainTotal } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

// צבעים לרשתות - 10 צבעים שונים
const CHAIN_COLORS = [
  '#14B8A6', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6',
  '#EC4899', '#10B981', '#F97316', '#06B6D4', '#6366F1',
];

interface BranchMapProps {
  open: boolean;
  onClose: () => void;
  chainTotals: PriceChainTotal[];
  userLat?: number;
  userLng?: number;
}

// מרקר SVG מותאם אישית לכל רשת - עגול עם אות ראשונה
const createMarkerIcon = (L: typeof import('leaflet'), color: string, label: string) => {
  const letter = label.charAt(0);
  const html = `
    <div style="
      width:36px; height:36px; border-radius:50% 50% 50% 0;
      background:${color}; border:3px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.35);
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:14px; color:white;
      transform:rotate(-45deg);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <span style="transform:rotate(45deg)">${letter}</span>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 36] });
};

// מרקר מיקום נוכחי
const createUserMarker = (L: typeof import('leaflet')) => {
  const html = `
    <div style="
      width:18px; height:18px; border-radius:50%;
      background:#2563EB; border:3px solid white;
      box-shadow:0 0 0 4px rgba(37,99,235,0.2), 0 3px 8px rgba(0,0,0,0.3);
    "></div>`;
  return L.divIcon({ html, className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
};

export const BranchMap = ({ open, onClose, chainTotals, userLat, userLng }: BranchMapProps) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [userMarkerRef] = useState<{ marker: import('leaflet').Marker | null }>({ marker: null });

  // אתחול המפה
  useEffect(() => {
    if (!open || !mapRef.current) return;

    let map: import('leaflet').Map | null = null;

    const initMap = async () => {
      const L = await import('leaflet');
      if (!mapRef.current || mapInstanceRef.current) return;

      // ישראל - מרכז
      const defaultCenter: [number, number] = [31.7683, 35.2137];
      const defaultZoom = 8;

      map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false, // נוסיף בעצמנו בצד הנכון
        attributionControl: true,
      });

      // tiles - OpenStreetMap עם סגנון מודרני
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapInstanceRef.current = map;

      // הוספת מרקרים
      const bounds: [number, number][] = [];
      chainTotals.forEach((chain, idx) => {
        const branch = chain.nearestBranch;
        if (!branch || typeof branch.lat !== 'number' || typeof branch.lng !== 'number') return;

        const color = CHAIN_COLORS[idx % CHAIN_COLORS.length];
        const icon = createMarkerIcon(L, color, chain.chainName);
        const marker = L.marker([branch.lat, branch.lng], { icon });

        // popup מידע מעוצב
        const distText = typeof branch.distanceKm === 'number'
          ? `${branch.isApproximate ? '~' : ''}${branch.distanceKm.toFixed(1)} ק"מ`
          : '';
        const popupHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:160px;direction:rtl">
            <div style="font-weight:800;font-size:14px;color:${color};margin-bottom:4px">${chain.chainName}</div>
            <div style="font-size:12px;color:#374151;font-weight:600;margin-bottom:2px">${branch.branchName}</div>
            <div style="font-size:11px;color:#6B7280">${[branch.city, branch.address].filter(Boolean).join(', ')}</div>
            ${distText ? `<div style="font-size:11px;color:#0D9488;font-weight:700;margin-top:4px">📍 ${distText}</div>` : ''}
            ${chain.total > 0 ? `<div style="font-size:11px;color:#059669;font-weight:700;margin-top:2px">🛒 ₪${chain.total.toFixed(0)}</div>` : ''}
          </div>`;
        marker.bindPopup(popupHtml, { closeButton: false, maxWidth: 220 });
        marker.addTo(map!);
        bounds.push([branch.lat, branch.lng]);
      });

      // מיקום משתמש
      if (typeof userLat === 'number' && typeof userLng === 'number') {
        userMarkerRef.marker = L.marker([userLat, userLng], {
          icon: createUserMarker(L),
          zIndexOffset: 1000,
        }).addTo(map);
        bounds.push([userLat, userLng]);
      }

      // צנטרינג לפי כל המרקרים
      if (bounds.length > 0) {
        map.fitBounds(bounds as [number, number][], { padding: [40, 40], maxZoom: 14 });
      }

      setLoading(false);
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
      setLoading(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // כפתור מיקום נוכחי
  const handleLocate = useCallback(async () => {
    if (!mapInstanceRef.current || locating) return;
    setLocating(true);
    try {
      const L = await import('leaflet');
      const pos: GeolocationPosition = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 30000 });
      });
      const { latitude, longitude } = pos.coords;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 13, { animate: true });
        if (userMarkerRef.marker) {
          userMarkerRef.marker.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.marker = L.marker([latitude, longitude], {
            icon: createUserMarker(L),
            zIndexOffset: 1000,
          }).addTo(mapInstanceRef.current);
        }
      }
    } catch { /* נכשל בשקט */ }
    setLocating(false);
  }, [locating, userMarkerRef]);

  // פקדי zoom
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);
  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const branchCount = chainTotals.filter(c => c.nearestBranch?.lat).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: isDark ? '#111827' : '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {/* כותרת - עם חץ חזרה */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.25,
        pt: 'max(env(safe-area-inset-top) + 8px, 12px)',
        bgcolor: isDark ? '#1F2937' : 'white',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <IconButton
          onClick={onClose}
          aria-label="חזור"
          sx={{
            color: 'text.primary',
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            width: 38, height: 38,
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)' },
            '&:active': { transform: 'scale(0.94)' },
          }}
        >
          <ArrowForwardIcon sx={{ fontSize: 22 }} />
        </IconButton>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            🗺️ מפת סניפים
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1 }}>
            {branchCount > 0 ? `${branchCount} סניפים קרובים` : 'אין סניפים להציג'}
          </Typography>
        </Box>

        {/* אגדה - צבעי הרשתות */}
        <Box sx={{
          display: 'flex', gap: 0.5, flexWrap: 'nowrap', overflow: 'hidden',
          maxWidth: '45%',
        }}>
          {chainTotals.filter(c => c.nearestBranch?.lat).slice(0, 4).map((chain, idx) => (
            <Box key={chain.chainId} sx={{
              display: 'flex', alignItems: 'center', gap: 0.3,
              px: 0.75, py: 0.35, borderRadius: '999px',
              bgcolor: `${CHAIN_COLORS[idx % CHAIN_COLORS.length]}18`,
              border: `1px solid ${CHAIN_COLORS[idx % CHAIN_COLORS.length]}40`,
              flexShrink: 0,
            }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: CHAIN_COLORS[idx % CHAIN_COLORS.length],
                flexShrink: 0,
              }} />
              <Typography sx={{
                fontSize: 10, fontWeight: 700, lineHeight: 1,
                color: CHAIN_COLORS[idx % CHAIN_COLORS.length],
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 60,
              }}>
                {chain.chainName}
              </Typography>
            </Box>
          ))}
          {chainTotals.filter(c => c.nearestBranch?.lat).length > 4 && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', alignSelf: 'center', flexShrink: 0 }}>
              +{chainTotals.filter(c => c.nearestBranch?.lat).length - 4}
            </Typography>
          )}
        </Box>
      </Box>

      {/* מיכל המפה */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* המפה עצמה */}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* ספינר טעינה */}
        {loading && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isDark ? 'rgba(17,24,39,0.85)' : 'rgba(248,250,252,0.85)',
            backdropFilter: 'blur(4px)',
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={36} sx={{ color: '#14B8A6', mb: 1 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                טוען מפה...
              </Typography>
            </Box>
          </Box>
        )}

        {/* פקדי מפה - ימין, לא חופפים */}
        {!loading && (
          <Box sx={{
            position: 'absolute',
            insetInlineEnd: 12, top: 12,
            display: 'flex', flexDirection: 'column', gap: 0.75,
            zIndex: 500,
          }}>
            {/* Zoom In */}
            <Box
              role="button"
              aria-label="הגדל"
              onClick={handleZoomIn}
              sx={mapControlBtnSx(isDark)}
            >
              <AddIcon sx={{ fontSize: 20, color: 'text.primary' }} />
            </Box>

            {/* Zoom Out */}
            <Box
              role="button"
              aria-label="הקטן"
              onClick={handleZoomOut}
              sx={mapControlBtnSx(isDark)}
            >
              <RemoveIcon sx={{ fontSize: 20, color: 'text.primary' }} />
            </Box>

            {/* ספרטור */}
            <Box sx={{ height: 6 }} />

            {/* Current Location - נפרד מ-zoom, לא חופף */}
            <Box
              role="button"
              aria-label="מיקום נוכחי"
              onClick={handleLocate}
              sx={{
                ...mapControlBtnSx(isDark),
                bgcolor: locating
                  ? '#14B8A6'
                  : (isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.12)'),
                border: `1.5px solid ${isDark ? 'rgba(20,184,166,0.4)' : 'rgba(20,184,166,0.35)'}`,
              }}
            >
              {locating
                ? <CircularProgress size={18} sx={{ color: 'white' }} />
                : <MyLocationIcon sx={{ fontSize: 19, color: '#14B8A6' }} />}
            </Box>
          </Box>
        )}

        {/* "אין סניפים" placeholder */}
        {!loading && branchCount === 0 && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            bgcolor: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(248,250,252,0.92)',
            backdropFilter: 'blur(6px)',
            gap: 1.5,
          }}>
            <Typography sx={{ fontSize: 48 }}>🗺️</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary', textAlign: 'center' }}>
              אין סניפים להציג
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', maxWidth: 260 }}>
              אפשר מיקום כדי לראות את הסניפים הקרובים אליך
            </Typography>
          </Box>
        )}
      </Box>

      {/* תחתית - attribution */}
      <Box sx={{
        px: 2, py: 0.5,
        pb: 'max(env(safe-area-inset-bottom) + 4px, 6px)',
        bgcolor: isDark ? '#1F2937' : 'white',
        borderTop: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
          מפה: CARTO · OpenStreetMap · נתוני סניפים: פורטל שקיפות המחירים
        </Typography>
      </Box>
    </Dialog>
  );
};

// עיצוב כפתורי פקד מפה
const mapControlBtnSx = (isDark: boolean) => ({
  width: 40, height: 40,
  borderRadius: '12px',
  bgcolor: isDark ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
  border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}`,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  userSelect: 'none' as const,
  WebkitTapHighlightColor: 'transparent',
  transition: 'all 0.12s',
  '&:hover': {
    bgcolor: isDark ? 'rgba(31,41,55,1)' : 'white',
    boxShadow: '0 3px 16px rgba(0,0,0,0.22)',
  },
  '&:active': { transform: 'scale(0.93)' },
});
