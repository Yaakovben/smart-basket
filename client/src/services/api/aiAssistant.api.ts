import { API_URL, getAccessToken } from './client';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AiAssistantStreamError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export const aiAssistantApi = {
  /**
   * שולח היסטוריית שיחה לעוזר ה-AI וקורא ל-onDelta לכל חתיכת טקסט שמגיעה
   * בזמן אמת (SSE streaming, ראו aiAssistant.controller.ts בשרת) - במקום
   * לחכות לתשובה המלאה. fetch גולמי (לא apiClient/axios) כי axios לא תומך
   * טוב ב-streaming תגובות בדפדפן; ה-Authorization מוזרק ידנית.
   */
  async chatStream(messages: AiChatMessage[], onDelta: (text: string) => void): Promise<void> {
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
      let message = 'AI assistant request failed';
      try {
        const payload = await response.clone().json();
        if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
          message = payload.message;
        }
      } catch {
        // ignore JSON parse issues; keep generic server error
      }
      throw new AiAssistantStreamError(message, response.status);
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
