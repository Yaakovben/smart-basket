import { Box, Typography, CircularProgress } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import { haptic } from '../../../global/helpers';
import type { LocationStatus } from '../hooks/useUserLocation';

interface LocationStatusBannerProps {
  locationStatus: LocationStatus | undefined;
  onRequestLocation?: () => void;
  isDark: boolean;
}

// באנר מיקום - מוצג לפי מצב ה-geolocation הנוכחי (idle/requesting/granted/denied/blocked/unavailable/error)
export const LocationStatusBanner = ({ locationStatus, onRequestLocation, isDark }: LocationStatusBannerProps) => (
  <>
    {/* באנר מיקום - רק אם רלוונטי */}
    {onRequestLocation && locationStatus === 'idle' && (
      <Box
        onClick={onRequestLocation}
        sx={{
          mb: 1.25, p: 1.25, borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: 1,
          bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)',
          border: '1.5px dashed rgba(20,184,166,0.35)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:active': { transform: 'scale(0.99)' },
        }}
      >
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(20,184,166,0.15)',
          flexShrink: 0,
        }}>
          <MyLocationIcon sx={{ fontSize: 19, color: '#14B8A6' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>הפעל מיקום</Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.15 }}>
            נראה לך את הסניף הקרוב ביותר לכל רשת
          </Typography>
        </Box>
      </Box>
    )}

    {locationStatus === 'requesting' && (
      <Box sx={{
        mb: 1.25, p: 1.25, borderRadius: '12px',
        display: 'flex', alignItems: 'center', gap: 1,
        bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)',
      }}>
        <CircularProgress size={18} sx={{ color: '#14B8A6' }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>מאתר מיקום…</Typography>
      </Box>
    )}

    {locationStatus === 'granted' && (
      <Box sx={{
        mb: 1.25, px: 1, py: 0.55, borderRadius: '8px',
        display: 'inline-flex', alignItems: 'center', gap: 0.4,
        bgcolor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
      }}>
        <LocationOnIcon sx={{ fontSize: 13, color: '#059669' }} />
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#059669' }}>
          מיקום פעיל
        </Typography>
      </Box>
    )}

    {(locationStatus === 'denied' || locationStatus === 'blocked' || locationStatus === 'unavailable' || locationStatus === 'error') && (
      <Box sx={{
        mb: 1.25, p: 1.25, borderRadius: '10px',
        display: 'flex', alignItems: 'flex-start', gap: 0.75,
        bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
      }}>
        <LocationOffIcon sx={{ fontSize: 16, color: '#D97706', flexShrink: 0, mt: 0.15 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {locationStatus === 'blocked' ? 'המיקום חסום בדפדפן'
              : locationStatus === 'denied' ? 'מיקום לא משותף'
              : locationStatus === 'unavailable' ? 'הדפדפן לא תומך במיקום'
              : 'לא הצלחנו לקבל מיקום'}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25, lineHeight: 1.4 }}>
            {locationStatus === 'blocked' ? (() => {
              // הוראות מותאמות לפי הפלטפורמה - באייפון אין אייקון מנעול בכתובת.
              const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
              const isIOS = /iPad|iPhone|iPod/.test(ua);
              if (isIOS) {
                return 'הגדרות iOS → Safari → מיקום → "תוך כדי שימוש באפליקציה". לאחר מכן רעננו את הדף.';
              }
              const isAndroid = /Android/.test(ua);
              if (isAndroid) {
                return 'הקישו על ה-⋮ בדפדפן → "הגדרות אתר" → הרשו "מיקום" → רעננו את הדף.';
              }
              return 'פתחו את הגדרות האתר בדפדפן, הרשו "מיקום", ורעננו את הדף.';
            })()
              : locationStatus === 'denied'
              ? 'אם רוצים, אפשרו מיקום בהגדרות הדפדפן או לחצו "נסה שוב"'
              : 'נסה שוב או רענן את הדף'}
          </Typography>
        </Box>
        {locationStatus !== 'unavailable' && locationStatus !== 'blocked' && onRequestLocation && (
          <Box
            role="button"
            tabIndex={0}
            onClick={() => { haptic('light'); onRequestLocation(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); onRequestLocation(); } }}
            sx={{
              flexShrink: 0,
              px: 1.1, py: 0.5, borderRadius: '999px',
              bgcolor: '#14B8A6', color: 'white',
              fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 2px 6px rgba(20,184,166,0.35)',
              transition: 'all 0.15s',
              '&:hover': { boxShadow: '0 3px 9px rgba(20,184,166,0.5)' },
              '&:active': { transform: 'scale(0.96)' },
            }}
          >
            נסה שוב
          </Box>
        )}
      </Box>
    )}
  </>
);
