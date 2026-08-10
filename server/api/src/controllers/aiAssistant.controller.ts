/**
 * aiAssistant.controller.ts
 *
 * Controller של עוזר ה-AI (צ'אט). מותקן ב-/api/ai-assistant.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import { logger } from '../config';
import { openAssistantStream, type ChatMessage } from '../services/aiAssistant.service';

/**
 * POST /api/ai-assistant/chat
 * שולח הודעה + היסטוריית שיחה לעוזר ה-AI, מזרים את התשובה חזרה כ-SSE
 * (chunk אחר chunk, כמו ChatGPT) במקום לחכות לתשובה המלאה - משפר משמעותית
 * את מהירות התגובה הנתפסת. כל שגיאות ה-setup (503/400/502 וכו') נזרקות
 * מ-openAssistantStream *לפני* שנשלחו headers ללקוח, כך שהן ממשיכות לעבור
 * כ-JSON error רגיל דרך asyncHandler+error middleware בדיוק כמו קודם.
 * רק שגיאה שקורית *באמצע* ה-stream (אחרי שכבר שלחנו headers/chunks) לא
 * יכולה יותר לשנות status code - נשלחת כ-SSE error event וסוגרים את החיבור.
 */
export const chat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { messages } = req.body as { messages: ChatMessage[] };

  const { reader, cleanup } = await openAssistantStream(userId, messages);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedAny = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            receivedAny = true;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          }
        } catch {
          // שורת SSE חלקית/לא תקינה - מתעלמים, ה-buffer כבר שומר את השארית
        }
      }
    }

    res.write(`data: ${JSON.stringify(
      receivedAny ? { done: true } : { error: 'AI assistant returned an empty response' }
    )}\n\n`);
    res.end();
  } catch (err) {
    logger.warn('aiAssistant: stream interrupted: %s', (err as Error).message);
    res.write(`data: ${JSON.stringify({ error: 'החיבור נקטע, נסה שוב' })}\n\n`);
    res.end();
  } finally {
    cleanup();
  }
});
