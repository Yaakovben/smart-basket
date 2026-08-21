import type { AiStatus } from '../../../services/api/admin.api';

export type AiHealthLevel = 'unknown' | 'healthy' | 'degraded' | 'down';

// נגזר מנתוני /admin/ai-status: בריא = הספק הראשי מוגדר ובלי שגיאה אחרונה.
// חלש = הראשי נכשל אבל הגיבוי תקין (השירות עדיין עובד, פשוט לא מהספק הראשי).
// מושבת = אין אף ספק מוגדר, או ששניהם נכשלו לאחרונה.
export function getAiHealth(data: AiStatus | null): AiHealthLevel {
  if (!data) return 'unknown';
  if (!data.configured) return 'down';

  const primary = data.providers.find(p => p.role === 'primary');
  const backup = data.providers.find(p => p.role === 'backup');
  const primaryOk = !!primary?.configured && !primary.lastError;
  const backupOk = !!backup?.configured && !backup.lastError;

  if (primaryOk) return 'healthy';
  if (backupOk) return 'degraded';
  return 'down';
}

export const AI_HEALTH_COLOR: Record<AiHealthLevel, string> = {
  unknown: '#9CA3AF',
  healthy: '#10B981',
  degraded: '#F59E0B',
  down: '#EF4444',
};

export const AI_HEALTH_LABEL: Record<AiHealthLevel, string> = {
  unknown: 'טוען סטטוס AI...',
  healthy: 'AI פעיל ותקין',
  degraded: 'AI עובד על ספק הגיבוי',
  down: 'AI לא זמין',
};
