import { Navigate } from 'react-router-dom';

// דף נחיתה של קישור הצטרפות: /join?code=...&password=...
//
// שומר code+password ל-localStorage ומפנה הביתה מיד, תמיד - בלי מסך
// ביניים, בכל דפדפן/פלטפורמה. useHome (useHome.ts) קורא את sb_join_code
// ופותח את מודאל ההצטרפות אוטומטית עם רמז קטן, לא חוסם, שאם האפליקציה
// כבר מותקנת עדיף להיכנס דרכה (ראו JoinGroupModal.tsx) - במקום מסך-ביניים
// נפרד עם כפתור "העתק קוד ופתח את האפליקציה" שהיה כאן בעבר: זה הרגיש כמו
// חסימה מיותרת בדיוק במקרה הנפוץ (דפדפן רגיל כמו כרום/ספארי), שם
// ההצטרפות עובדת מצוין ישר בדפדפן.
export const JoinLanding = () => {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('code') || '').trim();
  const password = (params.get('password') || '').trim();

  if (code) {
    try {
      localStorage.setItem('sb_join_code', code);
      if (password) localStorage.setItem('sb_join_password', password);
    } catch {
      // אחסון חסום (למשל Safari פרטי) - פשוט לא נשמר, ההצטרפות עדיין
      // אפשרית ידנית מהתפריט.
    }
  }

  return <Navigate to="/" replace />;
};

JoinLanding.displayName = 'JoinLanding';
