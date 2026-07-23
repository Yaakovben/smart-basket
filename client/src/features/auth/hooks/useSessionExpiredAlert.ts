import { useState, useEffect } from 'react';

// בדיקת session expired (מוגדר ב-client.ts כשרענון טוקן נכשל)
export const useSessionExpiredAlert = () => {
  const [sessionExpired, setSessionExpired] = useState(() => {
    try {
      return sessionStorage.getItem('session_expired') === 'true';
    } catch { return false; }
  });

  useEffect(() => {
    if (sessionExpired) {
      try { sessionStorage.removeItem('session_expired'); } catch { /* ignore */ }
    }
  }, [sessionExpired]);

  return { sessionExpired, dismissSessionExpired: () => setSessionExpired(false) };
};
