import type { TranslationKeys } from '../../../global/i18n/translations';
import { AiAssistantStreamError } from '../../../services/api';

// כמה זמן עד ש-resetAt (ISO מהשרת) - גם בדקות וגם בשעות עגולות, לפחות 1
// כדי לא להציג "בעוד 0".
function timeUntil(resetAt?: string | null): { minutes: number; hours: number } | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return {
    minutes: Math.max(1, Math.ceil(ms / 60_000)),
    hours: Math.max(1, Math.round(ms / 3_600_000)),
  };
}

/**
 * הודעת שגיאה ידידותית לעוזר ה-AI. משותפת לצ'אט ולמגירת ניתוח הרשימה, כדי
 * ששני המקומות יציגו בדיוק אותו נוסח - כולל "חוזר בעוד ~X שעות/דקות" כשה-
 * שרת מצרף resetAt (מכסה פר-משתמש או תקציב יומי גלובלי), במקום שגיאה סתמית.
 */
export function aiErrorText(err: unknown, t: (key: TranslationKeys) => string): string {
  const e = err instanceof AiAssistantStreamError ? err : null;
  const wait = timeUntil(e?.resetAt);
  const waitSuffix = wait
    ? ' ' + (wait.minutes > 90
        ? t('aiTryAgainInHours').replace('{hours}', String(wait.hours))
        : t('aiTryAgainInMinutes').replace('{minutes}', String(wait.minutes)))
    : '';

  if (e?.code === 'AI_DAILY_LIMIT') return t('aiDailyLimitReached') + waitSuffix;
  if (e?.status === 503) return t('aiNotConfigured');
  if (e?.status === 429) return t('aiTooManyMessages') + waitSuffix;
  return t('aiGenericError');
}
