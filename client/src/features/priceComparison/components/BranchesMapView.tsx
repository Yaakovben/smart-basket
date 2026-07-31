/**
 * BranchesMapView - מפת סניפים חופשית (Leaflet + OpenStreetMap, בלי API key/חיוב).
 * מציגה את כל הסניפים הקרובים למשתמש (או פריסה ארצית אם אין מיקום) עם פופאפ
 * לכל סניף וכפתור "ניווט" שפותח את אותו picker חיצוני (Waze/Google/Apple)
 * שכבר קיים בהשוואת המחירים - לא כופלים לוגיקת deep-link.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, CircularProgress, IconButton, Tooltip } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useUserLocation } from '../hooks/useUserLocation';
import { priceComparisonApi } from '../services/priceComparison.api';
import { NavigationPicker } from './NavigationPicker';
import type { NearestBranch } from '../types/priceComparison.types';

// ברירת מחדל כשאין מיקום משתמש - מרכז הארץ (תל אביב), זום רחב שמראה את רוב הסניפים
const ISRAEL_DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];
const ISRAEL_DEFAULT_ZOOM = 8;
const USER_LOCATION_ZOOM = 13;
// רדיוס חיפוש כשיש מיקום - קצת יותר נדיב מברירת המחדל של ה-API (15) כי
// במפה יש ערך להראות גם סניפים קצת יותר רחוקים, לא רק את הקרוב ביותר.
const NEARBY_RADIUS_KM = 20;

// חישוב מרחק - עותק קליל של הנוסחה בשרת (branches.service.ts), רק כדי
// למלא distanceKm בפופאפ הניווט. לא שווה לייבא מודול שרת ללקוח בשביל זה.
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// זיהוי רשת דרך צבע בלבד לא עובד כאן: ולידציה עם validate_palette.js (ראו
// שיחת התכנון) הראתה שמעבר ל-3 קטגוריות תחת בדיקת "כל הזוגות" (רלוונטית
// לפינים מפוזרים על מפה, בניגוד לעמודות בסדר קבוע) הגוונים כבר לא ניתנים
// להבחנה בבטחה (גם לעיוורי צבעים וגם לראייה רגילה) - ויש כאן ~15 רשתות.
// לכן הזהות עוברת דרך מונוגרם טקסטואלי בתוך פין באותו צבע מותג אחיד,
// לא דרך גוון - זה גם נגיש יותר וגם קריא יותר מ-15 גוונים דומים.
const branchIconCache = new Map<string, L.DivIcon>();

// מונוגרם דו-אותיות מתוך שם הרשת: אות ראשונה משתי המילים הראשונות
// (מתעלם ממילים מספריות כמו "2000"), או שתי האותיות הראשונות אם מילה אחת.
function getChainMonogram(chainName: string): string {
  const words = chainName.trim().split(/\s+/).filter(w => w && !/^\d+$/.test(w));
  if (words.length >= 2) return `${words[0][0] || ''}${words[1][0] || ''}`;
  return (words[0] || chainName).slice(0, 2);
}

// אייקון פין (SVG inline) - נמנעים מבעיית ה-assets הקלאסית של leaflet
// (marker-icon.png לא נטען נכון עם bundlers). צל אליפסה מתחת לפין (כמו
// ב-Google Maps) נותן תחושת עומק. אנימציית drop-in מוגדרת ב-<style> למטה.
function getBranchIcon(chainName: string): L.DivIcon {
  const cached = branchIconCache.get(chainName);
  if (cached) return cached;
  const monogram = getChainMonogram(chainName);
  const icon = L.divIcon({
    className: 'sb-branch-marker',
    html: `
      <div class="sb-pin-wrap">
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">
          <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#14B8A6" stroke="#0D9488" stroke-width="1"/>
          <circle cx="15" cy="14" r="9.5" fill="#fff"/>
          <text x="15" y="14.5" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="800" font-family="system-ui,-apple-system,sans-serif" fill="#0D9488">${monogram}</text>
        </svg>
        <div class="sb-pin-shadow"></div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
  branchIconCache.set(chainName, icon);
  return icon;
}

// אייקון נקודת מיקום המשתמש - עיגול כחול עם טבעת "פועם" (pulse) שמרגישה
// כמו מיקום חי בזמן אמת (בהשראת Google Maps "blue dot"), לא נקודה סטטית.
const userIcon = L.divIcon({
  className: 'sb-user-marker',
  html: `
    <div class="sb-user-pulse-ring"></div>
    <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);position:relative;z-index:1"></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// כפתור "מרכז אליי" צף - צריך גישה למופע המפה עצמו (useMap), ולכן
// חייב לחיות כרכיב-בן בתוך MapContainer ולא לקבל את המפה כ-prop.
const RecenterButton = ({ location }: { location: { lat: number; lng: number } | null }) => {
  const map = useMap();
  if (!location) return null;
  return (
    <Tooltip title="מרכז למיקום שלי" placement="left">
      <IconButton
        onClick={() => map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), USER_LOCATION_ZOOM), { duration: 0.6 })}
        aria-label="מרכז למיקום שלי"
        sx={{
          // bottom: 36px - מעל ה-attribution שגובהו ~24px + מרווח; topright
          // כדי לא להתנגש עם בקרי הזום שעברו ל-topright אבל לשמור על זרימה
          // ויזואלית (location = "איפה אני" → קרוב לגרף זום).
          // השתמשנו ב-right/bottom ולא insetInlineEnd כי leaflet מחשב לפי LTR.
          // bottom: 80px - מתחת לזום שב-topright ומעל ה-attribution
          position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
          bgcolor: 'background.paper', width: 40, height: 40,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <MyLocationIcon sx={{ fontSize: 20, color: '#2563EB' }} />
      </IconButton>
    </Tooltip>
  );
};

interface NearbyBranchApi {
  chainId: string;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

interface Props {
  isDark?: boolean;
  // true כשהמפה מתארחת במסך מלא (BranchesMapDialog) - ממלאת את כל הגובה
  // הפנוי במקום לקבל גובה קבוע. ברירת המחדל (440px) משמשת רק לשימוש עצמאי.
  fillHeight?: boolean;
}

export const BranchesMapView = ({ isDark = false, fillHeight = false }: Props) => {
  const { location } = useUserLocation();
  const [branches, setBranches] = useState<NearbyBranchApi[] | null>(null);
  const [loading, setLoading] = useState(true);
  // הסניף שנבחר לפתיחת picker ניווט (Waze/Google/Apple) - אותו רכיב
  // בדיוק כמו בהשוואת המחירים, בלי לשכפל לוגיקת deep-link.
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    priceComparisonApi.getNearbyBranches(location ?? undefined, location ? NEARBY_RADIUS_KM : undefined)
      .then(res => { if (!cancelled) setBranches(res); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  const center = useMemo<[number, number]>(
    () => location ? [location.lat, location.lng] : ISRAEL_DEFAULT_CENTER,
    [location]
  );
  const zoom = location ? USER_LOCATION_ZOOM : ISRAEL_DEFAULT_ZOOM;

  const openNav = (b: NearbyBranchApi) => {
    // distanceKm מחושב רק אם יש מיקום משתמש - בדיוק כמו בהתנהגות השרת
    // (findNearestBranch). NavigationPicker כבר יודע להתמודד עם ערך חסר.
    const distanceKm = location
      ? Math.round(haversineKm(location, b) * 10) / 10
      : (undefined as unknown as number);
    setNavBranch({
      branchName: `${b.chainName} - ${b.storeName}`,
      city: b.city,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      distanceKm,
    });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        ...(fillHeight && { height: '100%', display: 'flex', flexDirection: 'column' }),
      }}
      className={isDark ? 'sb-map-dark' : undefined}
    >
      {/* עיצוב מותאם לרכיבי Leaflet (פופאפ/זום/פינים) - אלה DOM גולמי שלא
          עובר sx/MUI, ולכן חייבים override גלובלי מוגבל ל-scope הזה. פין
          עם "נפילה" קלה + טבעת פועמת סביב נקודת המשתמש הן מה שהופך מפה
          סטטית להרגיש חיה, בהשראת Google Maps. */}
      <style>{`
        .sb-branch-marker { animation: sbPinDrop .45s cubic-bezier(.34,1.56,.64,1) both; transform-origin: bottom center; }
        @keyframes sbPinDrop { from { transform: translateY(-14px) scale(.6); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        .sb-pin-wrap { position: relative; }
        .sb-pin-shadow { position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 14px; height: 5px; border-radius: 50%; background: rgba(0,0,0,0.35); filter: blur(1px); }
        .sb-user-marker { z-index: 500 !important; }
        .sb-user-pulse-ring { position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: rgba(37,99,235,0.45); animation: sbUserPulse 2s ease-out infinite; }
        @keyframes sbUserPulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3.4); opacity: 0; } }
        .sb-popup .leaflet-popup-content-wrapper { border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.22); }
        .sb-popup .leaflet-popup-content { margin: 10px 12px; }
        .sb-popup .leaflet-popup-close-button { top: 6px !important; inset-inline-end: 6px !important; }
        .leaflet-control-zoom { border: none !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.22) !important; }
        .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; }
        .leaflet-control-attribution { border-radius: 6px 0 0 0 !important; }
        .sb-map-dark .leaflet-control-zoom a { background: #1e293b !important; color: #e2e8f0 !important; }
        .sb-map-dark .leaflet-popup-content-wrapper, .sb-map-dark .leaflet-popup-tip { background: #1e293b !important; color: #e2e8f0 !important; }
        .sb-map-dark .leaflet-control-attribution { background: rgba(30,41,59,0.75) !important; color: #cbd5e1 !important; }
        .sb-map-dark .leaflet-control-attribution a { color: #93c5fd !important; }
        /* משתמשים שכיבו אנימציות במערכת (הגדרת נגישות) - מכבדים את זה, לא
           רק עיצוב: פינים "נופלים" וטבעת פועמת הן תנועה לא-פונקציונלית. */
        @media (prefers-reduced-motion: reduce) {
          .sb-branch-marker, .sb-user-pulse-ring { animation: none !important; }
        }
        /* פוקוס מקלדת גלוי על פינים - Leaflet הופך אותם ל-focusable (tabindex)
           אבל לא מספק outline ברירת מחדל, כך שמשתמשי מקלדת "מאבדים" את המיקוד. */
        .leaflet-interactive:focus-visible { outline: 3px solid #14B8A6; outline-offset: 2px; }
        /* חלופה נגישה לקוראי מסך - תוכן אמיתי, מוסתר ויזואלית בלבד */
        .sb-sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
        }
      `}</style>
      {/* חלופה טקסטואלית לקוראי מסך: Leaflet מרנדר div-ים גולמיים בלי משמעות
          סמנטית (attribute "alt" על div לא נקרא ע"י קוראי מסך), אז במקום
          לנסות "לתקן" ARIA על המפה עצמה - נותנים רשימה אמיתית ושקולה,
          מוסתרת חזותית, עם אותה פעולת ניווט כמו בפופאפ. */}
      {branches && branches.length > 0 && (
        <ul className="sb-sr-only" aria-label="רשימת סניפים קרובים">
          {branches.map((b, idx) => (
            <li key={`sr-${b.chainId}-${b.storeName}-${idx}`}>
              {b.chainName} {b.storeName}{(b.address || b.city) ? `, ${[b.address, b.city].filter(Boolean).join(', ')}` : ''}
              <button type="button" onClick={() => openNav(b)}>ניווט לסניף {b.chainName} {b.storeName}</button>
            </li>
          ))}
        </ul>
      )}
      <Box
        role="region"
        aria-label="מפת סניפים קרובים"
        sx={{
          ...(fillHeight ? { flex: 1, minHeight: 0 } : { height: 440 }),
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ width: '100%', height: '100%' }}>
          {/* טיילים של CARTO (בנויים על OSM) - חינמי לגמרי, בלי מפתח API, רק
              attribution. נבחר על פני טייל ה-OSM הגולמי כי הוא הרבה יותר "חי"
              ועשיר בצבע (וריאנט Voyager/Dark תואם למצב בהיר/כהה של האפליקציה),
              ולא נראה שטוח ומיושן כמו הטייל הבסיסי. */}
          <TileLayer
            url={isDark
              ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* זום: topright - רחוק מ-attribution (bottomright) וממרכז-אליי (bottomright).
              כפתור "מרכז אליי" ב-bottomright, מספיק גבוה שלא יחפוף את ה-attribution. */}
          <ZoomControl position="topright" />
          <RecenterButton location={location} />

          {location && (
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup className="sb-popup">המיקום שלך</Popup>
            </Marker>
          )}

          {branches?.map((b, idx) => (
            <Marker key={`${b.chainId}-${b.storeName}-${idx}`} position={[b.lat, b.lng]} icon={getBranchIcon(b.chainName)}>
              <Popup className="sb-popup">
                <Box sx={{ minWidth: 160, textAlign: 'right', direction: 'rtl' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0D9488' }}>
                    {b.chainName}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, mt: 0.25 }}>
                    {b.storeName}
                  </Typography>
                  {(b.address || b.city) && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                      {[b.address, b.city].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => openNav(b)}
                    startIcon={<NearMeIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      mt: 1, bgcolor: '#0D9488', '&:hover': { bgcolor: '#0F766E' },
                      fontSize: 11, fontWeight: 800, textTransform: 'none',
                      borderRadius: '8px', px: 1.5, py: 0.4, minWidth: 0,
                    }}
                  >
                    ניווט
                  </Button>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>

      {loading && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)', borderRadius: '14px',
        }}>
          <CircularProgress size={28} sx={{ color: '#14B8A6' }} />
        </Box>
      )}

      {!loading && branches !== null && branches.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 2, px: 3 }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>
            לא נמצאו סניפים באזור שלך
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
            נסה להרחיב את אזור החיפוש או לבדוק שוב מאוחר יותר
          </Typography>
        </Box>
      )}

      {!location && !loading && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1, mt: 0.5,
          bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)',
          borderRadius: '10px', border: '1px solid rgba(20,184,166,0.2)',
        }}>
          <Typography sx={{ fontSize: 11.5, color: '#0D9488', fontWeight: 600 }}>
            📍 שתף מיקום כדי לראות סניפים קרובים אליך — כרגע מוצגת פריסה ארצית
          </Typography>
        </Box>
      )}

      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
};
