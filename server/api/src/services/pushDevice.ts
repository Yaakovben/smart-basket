// זיהוי סוג המכשיר של מנוי התראות מהאתר (דפדפן או מסך הבית), לפי ה-User-Agent.
// משמש כדי שטלפון שהותקנה בו האפליקציה מהחנות לא יקבל כל התראה פעמיים:
// פעם מהאתר שבמסך הבית ופעם מהאפליקציה. אייפד בגרסאות חדשות מזדהה כמחשב
// מק, ולכן נחשב מחשב (במקרה הגרוע תגיע שם התראה כפולה, לא תחסר התראה).
export type WebPushDevice = 'ios' | 'android' | 'desktop';

export function webPushDeviceFromUserAgent(userAgent: string | undefined): WebPushDevice {
  const ua = userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
