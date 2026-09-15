/**
 * insecureAgent.ts
 *
 * סוכן HTTPS משותף שמדלג על אימות תעודה, לשימוש ייעודי בלקוחות ה-axios
 * שמורידים קבצים מפורטלי השקיפות (חלקם מחזירים שרשרת תעודות לא תקפה).
 *
 * חשוב: הסוכן הזה מוזרק במפורש (httpsAgent) לכל בקשה שצריכה אותו, ולא
 * דרך process.env.NODE_TLS_REJECT_UNAUTHORIZED - כדי לא לבטל אימות TLS
 * גלובלית לכל שאר התהליך (Google OAuth, Sentry, MongoDB, LocationIQ וכו')
 * בזמן שהסנכרון רץ.
 *
 * סיכון אבטחה ידוע: rejectUnauthorized:false חושף לתקיפת MITM על הורדת
 * קבצי XML של רשתות השקיפות. הנתונים המורדים הם ציבוריים לחלוטין (לא
 * כוללים פרטי משתמשים או מפתחות), ולכן ההשפעה מוגבלת לזיוף נתוני מחירים.
 * TODO: לזהות אילו פורטלים מחזירים שרשרת לא תקפה ולהוסיף CA pinning
 * ספציפי (ca: fs.readFileSync('portal-ca.pem')) לסוכנים שלהם, ולהסיר סוכן זה.
 */
import { Agent as HttpsAgent } from 'https';

export const insecureHttpsAgent = new HttpsAgent({ rejectUnauthorized: false });
