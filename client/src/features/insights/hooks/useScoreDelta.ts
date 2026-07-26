import { useState, useEffect } from 'react';

// ===== Score Trend - מציין השינוי בציון מאז הביקור הקודם =====
// משתמש ב-localStorage לשמור את הציון האחרון שראינו. תווית קטנה
// שמופיעה ליד הציון בדופק: "+5 השבוע" או "-2".
export const useScoreDelta = (currentScore: number): number | null => {
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const KEY = 'sb_last_score_seen';
    try {
      const raw = window.localStorage.getItem(KEY);
      const last = raw ? parseInt(raw, 10) : NaN;
      if (!isNaN(last) && last !== currentScore) {
        // תלוי בקריאת localStorage (I/O), לא ניתן לחשב ברינדור
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDelta(currentScore - last);
      }
      window.localStorage.setItem(KEY, String(currentScore));
    } catch {
      // safeStorage לא נחוץ כאן - נכשל בשקט אם localStorage חסום
    }
  }, [currentScore]);
  return delta;
};
