import { API_URL, getAccessToken } from './client';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AiAssistantStreamError extends Error {
  status?: number;
  // מתי המכסה (rate limit) מתחדשת - מגיע מה-body (resetAt) ששרת ה-API מצרף
  // על 429 (aiAssistantLimiter פר-משתמש, או ה-guard של התקציב היומי).
  resetAt?: string | null;
  // code מהשרת - מבדיל בין "יותר מדי הודעות השעה" ל-'AI_DAILY_LIMIT'
  // (המכסה היומית הגלובלית נגמרה), כדי להציג את ההודעה הנכונה.
  code?: string | null;
  constructor(message: string, status?: number, resetAt?: string | null, code?: string | null) {
    super(message);
    this.status = status;
    this.resetAt = resetAt;
    this.code = code;
  }
}

export const aiAssistantApi = {
  /**
   * שולח היסטוריית שיחה לעוזר ה-AI וקורא ל-onDelta לכל חתיכת טקסט שמגיעה
   * בזמן אמת (SSE streaming, ראו aiAssistant.controller.ts בשרת) - במקום
   * לחכות לתשובה המלאה. fetch גולמי (לא apiClient/axios) כי axios לא תומך
   * טוב ב-streaming תגובות בדפדפן; ה-Authorization מוזרק ידנית.
   */
  async chatStream(
    messages: AiChatMessage[],
    onDelta: (text: string) => void,
    language?: 'he' | 'en' | 'ru'
  ): Promise<void> {
    const token = getAccessToken();
    const response = await fetch(`${API_URL}/ai-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, language }),
    });

    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new AiAssistantStreamError(
        'AI assistant request failed',
        response.status,
        body?.resetAt ?? null,
        body?.code ?? null,
      );
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

        let parsed: { delta?: string; done?: boolean; error?: string };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        if (parsed.error) throw new AiAssistantStreamError(parsed.error, 502);
        if (parsed.delta) onDelta(parsed.delta);
        if (parsed.done) return;
      }
    }
  },
};
