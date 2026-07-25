import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { socketService } from '../../services/socket/socket.service';

interface Props {
  // true כשיש כשל תקשורת אמיתי מול השרת (listsFetchError/notificationsFetchError) -
  // בניגוד ל-OfflineBanner, המצב הזה נקבע ע"י ה-caller (יודע אם בקשות באמת נכשלות),
  // לא מנוחש כאן. הבאנר נשאר גלוי כל עוד visible=true - עד שהבקשה הבאה מצליחה
  // (חשוב: ה-caller חייב להעביר כאן רק דגלים שבאמת מתאפסים בהצלחה - ראה הערה
  // ב-router/index.tsx לגבי initialData.connectionError שלא מתאפס).
  //
  // זה רק אחד משני האותות שמפעילים את הבאנר - ראה גם מעקב ה-socket למטה.
  // האות הזה מבוסס על fetch-ים אקראיים (GET רשימות/התראות) שרצים רק
  // בנקודות מסוימות (טעינה, visibilitychange, אירוע online) - לכן לבד הוא
  // לא תמיד תופס ניתוק "חי" תוך כדי שימוש רגיל במסך. המעקב אחר ה-socket
  // כן רציף בזמן אמת, ולכן הוא המקור האמין העיקרי.
  visible: boolean;
}

// באנר עליון קבוע - "אין חיבור לשרת" (בניגוד ל-OfflineBanner שהוא "אין חיבור לאינטרנט
// בכלל"). מוצג כשה-caller מדווח על fetch שנכשל, או כשה-socket מנותק בזמן אמת
// (ממזג את מה שהיה קודם ReconnectingBanner - שני האותות היו יכולים להציג שני
// באנרים חופפים). מוצג רק כשהמכשיר כן מחובר לאינטרנט (navigator.onLine) - שם
// OfflineBanner כבר מכסה את המקרה של ניתוק מלא.
export const ServerConnectionBanner = ({ visible }: Props) => {
  const { t } = useSettings();
  const [deviceOnline, setDeviceOnline] = useState(navigator.onLine);
  const [socketDisconnected, setSocketDisconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => setDeviceOnline(true);
    const handleOffline = () => { setDeviceOnline(false); setSocketDisconnected(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // מעקב socket בזמן אמת - זהה למה שהיה ב-ReconnectingBanner. דיליי של 3
  // שניות אחרי ניתוק מונע הבזקים על ניתוקים קצרים/רגילים (החלפת רשת וכו').
  useEffect(() => {
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubDisconnect = socketService.on('disconnect', () => {
      disconnectTimer = setTimeout(() => {
        if (navigator.onLine) setSocketDisconnected(true);
      }, 3000);
    });

    const unsubConnect = socketService.on('connect', () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      setSocketDisconnected(false);
    });

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      unsubDisconnect();
      unsubConnect();
    };
  }, []);

  const shouldShow = (visible || socketDisconnected) && deviceOnline;
  if (!shouldShow) return null;

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      bgcolor: '#F59E0B',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px',
      px: 2,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <CircularProgress size={12} sx={{ color: 'white' }} />
      <Typography sx={{
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
      }}>
        {socketDisconnected && !visible ? t('reconnectingMessage') : t('serverUnreachableMessage')}
      </Typography>
    </Box>
  );
};
