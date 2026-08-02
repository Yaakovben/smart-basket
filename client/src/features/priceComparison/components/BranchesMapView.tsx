/**
 * BranchesMapView - מפת סניפים (Leaflet + CartoDB, ללא API key).
 * גישת height: position absolute+inset:0 על MapContainer - האמינה ביותר
 * ב-Leaflet כי היא לא תלויה בהתנהגות flex/100% של ה-parent.
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useUserLocation } from '../hooks/useUserLocation';
import { priceComparisonApi } from '../services/priceComparison.api';
import { NavigationPicker } from './NavigationPicker';
import type { NearestBranch } from '../types/priceComparison.types';

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

const iconCache = new Map<string, L.DivIcon>();
function getBranchIcon(chainName: string): L.DivIcon {
  if (iconCache.has(chainName)) return iconCache.get(chainName)!;
  const m = getMonogram(chainName);
  const icon = L.divIcon({
    className: 'sb-pin',
    html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">
      <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
      <path filter="url(#sh)" d="M16 1C7.7 1 1 7.7 1 16c0 11 15 27 15 27s15-16 15-27C31 7.7 24.3 1 16 1z" fill="#14B8A6" stroke="#0D9488" stroke-width="1.5"/>
      <circle cx="16" cy="15" r="9" fill="white"/>
      <text x="16" y="15.5" text-anchor="middle" dominant-baseline="central" font-size="${m.length === 1 ? 10 : 8}" font-weight="900" font-family="system-ui,sans-serif" fill="#0D9488">${m}</text>
    </svg>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -42],
  });
  iconCache.set(chainName, icon);
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
  const map = useMap();
  if (!location) return null;
  return (
    <IconButton
      onClick={() => map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), USER_ZOOM), { duration: 0.6 })}
      aria-label="מרכז למיקום שלי"
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
}

interface Props {
  isDark?: boolean;
  fillHeight?: boolean;
}

export const BranchesMapView = ({ isDark = false, fillHeight = false }: Props) => {
  const { location, status: locationStatus, requestLocation } = useUserLocation();
  const [branches, setBranches] = useState<NearbyBranch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

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

  const validBranches = useMemo(
    () => (branches ?? []).filter(b => typeof b.lat === 'number' && typeof b.lng === 'number' && b.lat !== 0 && b.lng !== 0),
    [branches]
  );

  const openNav = (b: NearbyBranch) => {
    setNavBranch({
      branchName: `${b.chainName} - ${b.storeName}`,
      city: b.city, address: b.address, lat: b.lat, lng: b.lng,
      distanceKm: location ? Math.round(haversineKm(location, b) * 10) / 10 : (undefined as unknown as number),
    });
  };

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
              <Popup className="sb-popup"><b>המיקום שלי</b></Popup>
            </Marker>
          )}

          {validBranches.map((b, i) => (
            <Marker key={`${b.chainId}-${i}`} position={[b.lat, b.lng]} icon={getBranchIcon(b.chainName)}>
              <Popup className="sb-popup" minWidth={210}>
                <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    {/* תג עגול עם מונוגרם - מקום מוכן ללוגו אמיתי של הרשת
                        ברגע שיהיה; כרגע הזהות עוברת דרך טקסט ולא גוון (ראו
                        getBranchIcon - יותר מ-3 גוונים על מפה לא עומד בבדיקות
                        נגישות לעיוורי צבעים). */}
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      bgcolor: '#0D9488', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900, letterSpacing: 0.2,
                      boxShadow: '0 2px 6px rgba(13,148,136,0.4)',
                    }}>
                      {getMonogram(b.chainName)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0D9488', lineHeight: 1.25 }}>
                        {b.chainName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', lineHeight: 1.3, mt: 0.1 }}>
                        {b.storeName}
                      </Typography>
                    </Box>
                  </Box>
                  {(b.address || b.city) && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1, lineHeight: 1.4 }}>
                      📍 {[b.address, b.city].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  <Button
                    fullWidth size="small" variant="contained"
                    onClick={() => openNav(b)}
                    startIcon={<NearMeIcon sx={{ fontSize: 14 }} />}
                    sx={{ bgcolor: '#0D9488', '&:hover': { bgcolor: '#0F766E' }, fontSize: 12, fontWeight: 800, textTransform: 'none', borderRadius: '9px', py: 0.65 }}
                  >
                    ניווט
                  </Button>
                </Box>
              </Popup>
            </Marker>
          ))}
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
            טוען סניפים...
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
            לא נמצאו סניפים באזור
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
            📍 שתף מיקום לראות סניפים קרובים
          </Typography>
        </Box>
      )}

      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
};
