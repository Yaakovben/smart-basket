import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../context/SettingsContext';

interface Props {
  // true כשיש כשל תקשורת אמיתי מול השרת (listsFetchError/notificationsFetchError) -
  // בניגוד ל-OfflineBanner, המצב הזה נקבע ע"י ה-caller (יודע אם בקשות באמת נכשלות),
  // לא מנוחש כאן. הבאנר נשאר גלוי כל עוד visible=true - עד שהבקשה הבאה מצליחה
  // (חשוב: ה-caller חייב להעביר כאן רק דגלים שבאמת מתאפסים בהצלחה - ראה הערה
  // ב-router/index.tsx לגבי initialData.connectionError שלא מתאפס).
  visible: boolean;
}

// באנר עליון קבוע - "אין חיבור לשרת" (בניגוד ל-OfflineBanner שהוא "אין חיבור לאינטרנט
// בכלל"). מוצג רק כשהמכשיר כן מחובר לאינטרנט (navigator.onLine) כדי לא להציג שני
// באנרים חופפים כשהמכשיר במצב offline מלא - שם OfflineBanner כבר מכסה את זה.
export const ServerConnectionBanner = ({ visible }: Props) => {
  const { t } = useSettings();
  const [deviceOnline, setDeviceOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setDeviceOnline(true);
    const handleOffline = () => setDeviceOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!visible || !deviceOnline) return null;

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
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <Typography sx={{
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
      }}>
        ⚠️ {t('serverUnreachableMessage')}
      </Typography>
    </Box>
  );
};
