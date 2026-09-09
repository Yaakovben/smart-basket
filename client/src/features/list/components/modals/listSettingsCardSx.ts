// ===== סגנון משותף לשורות פעולה בהגדרות רשימה =====
// (שינוי סיסמה / הפוך למשותפת / הפוך לפרטית ב-EditListModal).
//
// גרסה שלישית. שתי הגרסאות הקודמות המציאו סגנון "כרטיס" ייחודי משלהן
// (גרדיאנט פסטלי, אח"כ תג-אייקון עגול צבעוני, שדה קוד עם רקע מפוספס
// מיוחד) - אף אחת מהן לא הסתדרה. הפתרון: להפסיק להמציא, ופשוט לשכפל
// *בדיוק* את שורת ה"הגדרות" הקיימת כבר בכל האפליקציה (ראו
// features/settings/styles/SettingsComponent.styles.ts - settingRowSx/
// rowLabelSx/subSettingRowSx) - אמוג'י פשוט (לא תג צבעוני), טקסט רגיל,
// ChevronLeftIcon כחיווי הרחבה, בתוך Paper מעוגל. זו "השפה של האפליקציה"
// שהמשתמש ביקש - לא סגנון חדש, השפה שכבר קיימת.
import type { SxProps, Theme } from '@mui/material';

export const settingsRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  p: 2,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:active': { bgcolor: 'action.selected' },
};

export const rowLabelSx: SxProps<Theme> = { flex: 1, minWidth: 0, fontWeight: 500, fontSize: 15 };
export const rowHintSx: SxProps<Theme> = { fontSize: 12.5, color: 'text.secondary', mt: 0.25 };

// שורת השדה המורחבת (סיסמה/קוד) - אותה הזחה (48px) כמו תת-שורות
// ההתראות הקיימות (subSettingRowSx), כדי שההרחבה תיראה כהמשך טבעי
// של השורה שמעליה, לא כתוסף נפרד.
export const expandedFieldRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: '4px 16px 16px 48px',
};

// פס צבעוני דק בצד הכרטיס - הפשרה אחרי שלוש גרסאות: לא רקע צבוע (v1),
// לא תג-אייקון עגול (v2), ולא לגמרי נייטרלי כמו שורת הגדרות רגילה (v3,
// "נעלם בעמוד" לפי המשתמש). borderInlineStart - לוגי, לא פיזי - נופל
// אוטומטית לצד ה"התחלה" (ימין ב-RTL) בלי לתלות בכיוון המסמך בקוד עצמו.
export const accentBarSx = (tone: 'accent' | 'neutral'): SxProps<Theme> => ({
  borderInlineStart: '3px solid',
  borderInlineStartColor: tone === 'accent' ? 'primary.main' : 'divider',
});
