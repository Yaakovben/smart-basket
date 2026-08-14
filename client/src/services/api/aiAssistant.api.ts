import { API_URL, getAccessToken } from './client';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AiAssistantStreamError extends Error {
  status?: number;
  // מתי המכסה (rate limit) מתחדשת - רק על שגיאת 429, מגיע מה-body (resetAt)
  // ששרת ה-API מצרף (ראו aiAssistantLimiter ב-rateLimiter.middleware.ts).
  resetAt?: string | null;
  constructor(message: string, status?: number, resetAt?: string | null) {
    super(message);
    this.status = status;
    this.resetAt = resetAt;
  }
}

export const aiAssistantApi = {
  /**
   * שולח היסטוריית שיחה לעוזר ה-AI וקורא ל-onDelta לכל חתיכת טקסט שמגיעה
   * בזמן אמת (SSE streaming, ראו aiAssistant.controller.ts בשרת) - במקום
   * לחכות לתשובה המלאה. fetch גולמי (לא apiClient/axios) כי axios לא תומך
   * טוב ב-streaming תגובות בדפדפן; ה-Authorization מוזרק ידנית.
   * onFallback (אופציונלי) נקרא אם השרת דיווח שהתשובה הזו הגיעה ממודל
   * גיבוי (הספק הראשי נכשל/נגמרה לו המכסה) - כדי שהצ'אט יציג חיווי עדין.
   */
  async chatStream(
    messages: AiChatMessage[],
    onDelta: (text: string) => void,
    onFallback?: () => void
  ): Promise<void> {
    const token = getAccessToken();
    const response = await fetch(`${API_URL}/ai-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok || !response.body) {
      let resetAt: string | null = null;
      if (response.status === 429) {
        resetAt = await response.json().then(b => b?.resetAt ?? null).catch(() => null);
      }
      throw new AiAssistantStreamError('AI assistant request failed', response.status, resetAt);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;

        let parsed: { delta?: string; done?: boolean; error?: string; meta?: { fallback?: boolean } };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        if (parsed.error) throw new AiAssistantStreamError(parsed.error, 502);
        if (parsed.meta?.fallback) onFallback?.();
        if (parsed.delta) onDelta(parsed.delta);
        if (parsed.done) return;
      }
    }
  },
};
