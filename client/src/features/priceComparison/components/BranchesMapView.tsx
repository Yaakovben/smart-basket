/**
 * BranchesMapView - מפת סניפים (Leaflet + CartoDB, ללא API key).
 * גישת height: position absolute+inset:0 על MapContainer - האמינה ביותר
 * ב-Leaflet כי היא לא תלויה בהתנהגות flex/100% של ה-parent.
 */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useUserLocation } from '../hooks/useUserLocation';
import { priceComparisonApi } from '../services/priceComparison.api';
import { NavigationPicker } from './NavigationPicker';
import { useSettings } from '../../../global/context/SettingsContext';
import { MemberAvatar } from '../../../global/components/MemberAvatar';
import type { User } from '../../../global/types';
import type { NearestBranch } from '../types/priceComparison.types';

// קריאה קלה מה-cache המקומי בלבד (בלי useAuth המלא - זה היה מפעיל שוב
// טעינת רשימות/התראות מהשרת, מיותר לגמרי כאן, רק כדי להציג שם+אווטאר
// בפופאפ "המיקום שלי").
function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem('cached_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const ISRAEL_CENTER: [number, number] = [31.7683, 35.2137];
const ISRAEL_ZOOM = 8;
const USER_ZOOM = 13;
const NEARBY_RADIUS_KM = 25;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function getMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => !/^\d+$/.test(w));
  if (words.length >= 2) return `${words[0][0] ?? ''}${words[1][0] ?? ''}`;
  return (words[0] ?? name).slice(0, 2);
}

// צבע מותג לפי רשת - רק לרשתות שיש עליהן סימן מסחרי ציבורי ומוכר מאוד
// (לא ניחוש). לכל השאר משאירים את צבע האפליקציה האחיד - עדיף גוון ניטרלי
// על פני "צבע מומצא" שמוצג כאילו הוא המותג האמיתי. הזהות בכל מקרה עוברת
// דרך המונוגרם (טקסט), לא דרך הצבע - כך גם רשת בלי צבע ייחודי מזוהה נכון.
const DEFAULT_CHAIN_COLOR = { fill: '#14B8A6', stroke: '#0D9488' };
const CHAIN_COLORS: Partial<Record<string, { fill: string; stroke: string }>> = {
  shufersal: { fill: '#E3121B', stroke: '#A50E15' }, // שופרסל - אדום
  rami_levy: { fill: '#F5821F', stroke: '#C2650F' }, // רמי לוי - כתום
  carrefour: { fill: '#0055A4', stroke: '#003872' }, // קרפור - כחול (מותג בינלאומי מוכר)
};
function getChainColor(chainId: string): { fill: string; stroke: string } {
  return CHAIN_COLORS[chainId] ?? DEFAULT_CHAIN_COLOR;
}

// ---- פרסור שעות פתיחה מפורמט OSM ----
const OSM_DAY_MAP: Record<string, number> = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function parseTimeMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function dayRangeIncludes(rangeStr: string, dayNum: number): boolean {
  // rangeStr can be "Mo-Fr", "Sa", "Mo,We,Fr", etc.
  for (const part of rangeStr.split(',')) {
    const dash = part.indexOf('-');
    if (dash > 0) {
      const from = OSM_DAY_MAP[part.slice(0, dash).trim()];
      const to = OSM_DAY_MAP[part.slice(dash + 1).trim()];
      if (from === undefined || to === undefined) continue;
      // handle wrap-around (e.g. Sa-Su for Sunday=0, Saturday=6)
      if (from <= to) {
        if (dayNum >= from && dayNum <= to) return true;
      } else {
        if (dayNum >= from || dayNum <= to) return true;
      }
    } else {
      if (OSM_DAY_MAP[part.trim()] === dayNum) return true;
    }
  }
  return false;
}

interface ParsedHours { isOpen: boolean | null; todayLabel: string | null; todayHours: string | null }

function parseOpeningHours(raw: string | undefined): ParsedHours {
  if (!raw) return { isOpen: null, todayLabel: null, todayHours: null };
  const trimmed = raw.trim();
  if (trimmed === '24/7' || trimmed === '24/7;') {
    return { isOpen: true, todayLabel: '24/7', todayHours: '00:00–24:00' };
  }

  const now = new Date();
  const todayNum = now.getDay(); // 0=Sun
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const rule of trimmed.split(';')) {
    const r = rule.trim();
    if (!r || r === 'off' || r === 'closed') continue;
    const timeMatch = r.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
    if (!timeMatch) continue;
    const startMin = parseTimeMin(timeMatch[1]);
    const endMin = parseTimeMin(timeMatch[2]);
    const daysPart = r.slice(0, r.indexOf(timeMatch[0])).trim().replace(/,$/, '');
    if (!daysPart || dayRangeIncludes(daysPart, todayNum)) {
      const label = `${timeMatch[1]}–${timeMatch[2]}`;
      const isOpen = nowMin >= startMin && nowMin < (endMin === 0 ? 24 * 60 : endMin);
      return { isOpen, todayLabel: HE_DAYS[todayNum], todayHours: label };
    }
  }
  return { isOpen: null, todayLabel: null, todayHours: null };
}

const iconCache = new Map<string, L.DivIcon>();
function getBranchIcon(chainId: string, chainName: string): L.DivIcon {
  const cacheKey = chainId;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!;
  const m = getMonogram(chainName);
  const { fill, stroke } = getChainColor(chainId);
  // בלי SVG feDropShadow פנימי - הצל כבר מגיע מ-.sb-pin (CSS filter על
  // האלמנט העוטף). כפל פילטרים (CSS + SVG) על עד 150 markers הוא יקר
  // במיוחד ב-composite בזמן pan/zoom ופוגע בתגובתיות המפה.
  const icon = L.divIcon({
    className: 'sb-pin',
    html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 1C7.7 1 1 7.7 1 16c0 11 15 27 15 27s15-16 15-27C31 7.7 24.3 1 16 1z" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="16" cy="15" r="9" fill="white"/>
      <text x="16" y="15.5" text-anchor="middle" dominant-baseline="central" font-size="${m.length === 1 ? 10 : 8}" font-weight="900" font-family="system-ui,sans-serif" fill="${stroke}">${m}</text>
    </svg>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -42],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

const userIcon = L.divIcon({
  className: 'sb-user',
  html: `<div style="position:relative;width:20px;height:20px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.35);animation:sbPulse 2s ease-out infinite"></div>
    <div style="position:absolute;inset:3px;border-radius:50%;background:#2563EB;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// מרכז מפה למיקום משתמש
function MapFlyTo({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (location && !done.current) {
      done.current = true;
      map.flyTo([location.lat, location.lng], USER_ZOOM, { duration: 0.8 });
    }
  }, [location, map]);
  return null;
}

// כפתור חזרה למיקום
function RecenterBtn({ location }: { location: { lat: number; lng: number } | null }) {
  const { t } = useSettings();
  const map = useMap();
  if (!location) return null;
  return (
    <IconButton
      onClick={() => map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), USER_ZOOM), { duration: 0.6 })}
      aria-label={t('mapRecenterAria')}
      sx={{
        position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
        bgcolor: 'white', width: 40, height: 40, borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        '&:hover': { bgcolor: '#f0fdfa' },
      }}
    >
      <MyLocationIcon sx={{ fontSize: 20, color: '#0D9488' }} />
    </IconButton>
  );
}

// invalidateSize - Dialog animation לוקח ~500ms, לכן מריצים פעמיים
function MapSizer() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 300);
    const t2 = setTimeout(() => map.invalidateSize(), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  useMapEvents({ resize: () => map.invalidateSize() });
  return null;
}

interface NearbyBranch {
  chainId: string; chainName: string; storeName: string;
  address: string; city: string; lat: number; lng: number;
  openingHours?: string;
}

interface Props {
  isDark?: boolean;
  fillHeight?: boolean;
}

export const BranchesMapView = ({ isDark = false, fillHeight = false }: Props) => {
  const { t } = useSettings();
  const { location, status: locationStatus, requestLocation } = useUserLocation();
  const [branches, setBranches] = useState<NearbyBranch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);
  const currentUser = useMemo(getCachedUser, []);

  // בקשת מיקום אוטומטית ברגע שהמפה נפתחת (רק אם עוד לא נשאל בכלל - 'idle').
  // פתיחת מפה היא כוונה ברורה מספיק לבקש מיקום כאן, ובלי זה משתמש חדש רואה
  // את הנתיב האיטי (עד 100 סניפים ארציים בלי סינון מרחק) בכל פתיחה, במקום
  // את הנתיב המהיר (סניפים קרובים בלבד) שהיה מקבל ברגע שיאשר מיקום פעם אחת.
  useEffect(() => {
    if (locationStatus === 'idle') requestLocation();
  }, [locationStatus, requestLocation]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    priceComparisonApi.getNearbyBranches(location ?? undefined, location ? NEARBY_RADIUS_KM : undefined)
      .then(res => { if (!cancelled) setBranches(res); })
      .catch(() => { if (!cancelled) setBranches([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  // מגבילים ל-150 markers - Leaflet מאט משמעותית מעל 200 (במיוחד במובייל)
  const validBranches = useMemo(
    () => (branches ?? [])
      .filter(b => typeof b.lat === 'number' && typeof b.lng === 'number' && b.lat !== 0 && b.lng !== 0)
      .slice(0, 150),
    [branches]
  );

  const openNav = useCallback((b: NearbyBranch) => {
    setNavBranch({
      branchName: `${b.chainName} - ${b.storeName}`,
      city: b.city, address: b.address, lat: b.lat, lng: b.lng,
      distanceKm: location ? Math.round(haversineKm(location, b) * 10) / 10 : (undefined as unknown as number),
    });
  }, [location]);

  // ה-JSX של עד 150 markers+popups ממורמז בנפרד מה-state של הדיאלוג
  // (navBranch/loading) - בלי זה, כל טאפ על "ניווט" בפופאפ מפעיל re-render
  // שבונה מחדש את כל עצי ה-Marker/Popup, וזה מה שגורם לתחושת "לא מגיב".
  const branchMarkers = useMemo(() => validBranches.map((b, i) => {
    const distanceKm = location ? Math.round(haversineKm(location, b) * 10) / 10 : null;
    return (
      <Marker key={`${b.chainId}-${i}`} position={[b.lat, b.lng]} icon={getBranchIcon(b.chainId, b.chainName)}>
        <Popup className="sb-popup" minWidth={200}>
          {(() => {
            const { fill, stroke } = getChainColor(b.chainId);
            const { isOpen, todayHours } = parseOpeningHours(b.openingHours);
            return (
              <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
                {/* שם הרשת + סניף */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.6 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    bgcolor: fill, mt: '1px',
                  }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: stroke, lineHeight: 1.3 }}>
                      {b.chainName}
                      {b.storeName && b.storeName !== b.chainName && (
                        <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 500, color: '#64748B', mr: 0.5 }}>
                          {' — '}{b.storeName}
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  {distanceKm !== null && (
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', flexShrink: 0 }}>
                      {distanceKm} ק"מ
                    </Typography>
                  )}
                </Box>

                {/* כתובת */}
                {(b.address || b.city) && (
                  <Typography sx={{ fontSize: 11, color: '#94A3B8', mb: todayHours ? 0.5 : 0.9, lineHeight: 1.4 }}>
                    {[b.address, b.city].filter(Boolean).join(', ')}
                  </Typography>
                )}

                {/* שעות פתיחה */}
                {todayHours && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.9 }}>
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      bgcolor: isOpen === true ? '#22C55E' : isOpen === false ? '#F87171' : '#CBD5E1',
                    }} />
                    <Typography sx={{ fontSize: 11, color: isOpen === true ? '#16A34A' : isOpen === false ? '#EF4444' : '#94A3B8', fontWeight: 600 }}>
                      {isOpen === true ? 'פתוח' : isOpen === false ? 'סגור' : ''}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>{todayHours}</Typography>
                  </Box>
                )}

                {/* קו מפריד עדין לפני הכפתור */}
                <Box sx={{ height: '1px', bgcolor: 'divider', opacity: 0.6, mb: 0.75 }} />

                {/* כפתור ניווט - תמיד ירוק, בלי קשר לצבע הרשת */}
                <Button
                  fullWidth size="small" variant="contained"
                  onClick={() => openNav(b)}
                  startIcon={<NearMeIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#22C55E', color: 'white',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
                    '&:hover': { bgcolor: '#16A34A', boxShadow: '0 2px 10px rgba(34,197,94,0.45)' },
                    fontSize: 11.5, fontWeight: 700, textTransform: 'none',
                    borderRadius: '8px', py: 0.6, mb: 0.5,
                    '& .MuiButton-startIcon': { mr: 1, ml: -0.25 },
                  }}
                >
                  {t('mapPopupNavigate')}
                </Button>
              </Box>
            );
          })()}
        </Popup>
      </Marker>
    );
  }), [validBranches, openNav, location, t]);

  return (
    <Box sx={{
      // fillHeight: position absolute ממלא parent; sinon: גובה קבוע
      ...(fillHeight
        ? { position: 'absolute', inset: 0 }
        : { position: 'relative', height: 440 }),
    }}>
      {/* CSS גלובלי לרכיבי Leaflet */}
      <style>{`
        .sb-pin { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
        @keyframes sbPulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(3.5);opacity:0} }
        .sb-popup .leaflet-popup-content-wrapper { border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.18); padding:0; }
        .sb-popup .leaflet-popup-content { margin:12px 14px; min-width:150px; }
        .sb-popup .leaflet-popup-close-button { top:8px!important; left:8px!important; right:auto!important; font-size:16px!important; }
        .leaflet-control-zoom { border:none!important; border-radius:10px!important; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.18)!important; }
        .leaflet-control-zoom a { width:36px!important; height:36px!important; line-height:36px!important; font-size:18px!important; }
        ${isDark ? `
        .leaflet-control-zoom a { background:#1e293b!important; color:#e2e8f0!important; }
        .sb-popup .leaflet-popup-content-wrapper,.sb-popup .leaflet-popup-tip { background:#1e293b!important; color:#e2e8f0!important; }
        .leaflet-control-attribution { background:rgba(30,41,59,0.8)!important; color:#94a3b8!important; }
        ` : ''}
        @media(prefers-reduced-motion:reduce){.sb-pin,[class*="sbPulse"]{animation:none!important}}
      `}</style>

      {/* MapContainer - position absolute ממלא 100% בדיוק */}
      <Box sx={{
        position: 'absolute', inset: 0,
        borderRadius: fillHeight ? 0 : '14px',
        overflow: 'hidden',
      }}>
        <MapContainer
          center={ISRAEL_CENTER}
          zoom={ISRAEL_ZOOM}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url={isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'
          />
          <ZoomControl position="topright" />
          <MapSizer />
          <MapFlyTo location={location} />
          <RecenterBtn location={location} />

          {location && (
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup className="sb-popup" minWidth={180}>
                <Box sx={{ direction: 'rtl', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  {currentUser ? (
                    <MemberAvatar member={currentUser} size={38} />
                  ) : (
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      bgcolor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                    }}>
                      <MyLocationIcon sx={{ fontSize: 18, color: 'white' }} />
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    {currentUser?.name && (
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
                        {currentUser.name}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#2563EB', lineHeight: 1.3 }}>
                      {t('mapMyLocation')}
                    </Typography>
                  </Box>
                </Box>
              </Popup>
            </Marker>
          )}

          {branchMarkers}
        </MapContainer>
      </Box>

      {/* ספינר טעינה */}
      {loading && (
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          bgcolor: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          borderRadius: fillHeight ? 0 : '14px',
          gap: 1,
        }}>
          <CircularProgress size={32} sx={{ color: '#14B8A6' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
            {t('mapLoadingBranches')}
          </Typography>
        </Box>
      )}

      {/* הודעות על גבי המפה */}
      {!loading && validBranches.length === 0 && (
        <Box sx={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, bgcolor: 'background.paper', borderRadius: '12px',
          px: 2, py: 1, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: '1px solid', borderColor: 'divider',
          maxWidth: '80%', textAlign: 'center',
        }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>
            {t('mapNoBranchesFound')}
          </Typography>
        </Box>
      )}

      {!location && !loading && (
        <Box sx={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, bgcolor: 'rgba(13,148,136,0.9)', borderRadius: '12px',
          px: 2, py: 1, boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
          maxWidth: '85%', textAlign: 'center',
        }}>
          <Typography sx={{ fontSize: 12, color: 'white', fontWeight: 700 }}>
            {t('mapShareLocationHint')}
          </Typography>
        </Box>
      )}

      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
};
