/**
 * BranchesMapView - מפת סניפים חופשית (Leaflet + OpenStreetMap, בלי API key/חיוב).
 * מציגה את כל הסניפים הקרובים למשתמש (או פריסה ארצית אם אין מיקום) עם פופאפ
 * לכל סניף וכפתור "ניווט" שפותח את אותו picker חיצוני (Waze/Google/Apple)
 * שכבר קיים בהשוואת המחירים - לא כופלים לוגיקת deep-link.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import NearMeIcon from '@mui/icons-material/NearMe';
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

// אייקון פין מותאם אישית (SVG inline) בצבע הטורקיז של האפליקציה - נמנעים
// מבעיית ה-assets הקלאסית של leaflet (marker-icon.png לא נטען נכון עם bundlers).
const branchIcon = L.divIcon({
  className: 'sb-branch-marker',
  html: `
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="#14B8A6" stroke="#0D9488" stroke-width="1"/>
      <circle cx="15" cy="15" r="6" fill="#fff"/>
    </svg>
  `,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -36],
});

// אייקון נקודת מיקום המשתמש - עיגול כחול פשוט
const userIcon = L.divIcon({
  className: 'sb-user-marker',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

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
}

export const BranchesMapView = ({ isDark = false }: Props) => {
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
    <Box sx={{ position: 'relative' }}>
      <Box sx={{
        height: 440,
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      }}>
        <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
          {/* OpenStreetMap raster tiles - חינמי לגמרי, בלי מפתח API. attribution
              חובה לפי מדיניות השימוש של OSM ומוצג אוטומטית בפינת המפה. */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {location && (
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup>המיקום שלך</Popup>
            </Marker>
          )}

          {branches?.map((b, idx) => (
            <Marker key={`${b.chainId}-${b.storeName}-${idx}`} position={[b.lat, b.lng]} icon={branchIcon}>
              <Popup>
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
                      mt: 1, bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' },
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

      {!loading && branches && branches.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
          לא נמצאו סניפים באזור שלך
        </Typography>
      )}

      {!location && (
        <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', mt: 1.25 }}>
          מציג פריסה ארצית - שתף מיקום כדי לראות סניפים קרובים אליך
        </Typography>
      )}

      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
};
