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
 */
import { Agent as HttpsAgent } from 'https';

export const insecureHttpsAgent = new HttpsAgent({ rejectUnauthorized: false });
