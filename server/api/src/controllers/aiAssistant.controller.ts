/**
 * aiAssistant.controller.ts
 *
 * Controller של עוזר ה-AI (צ'אט). מותקן ב-/api/ai-assistant.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import { chatWithAssistant, type ChatMessage } from '../services/aiAssistant.service';

/**
 * POST /api/ai-assistant/chat
 * שולח הודעה + היסטוריית שיחה לעוזר ה-AI, מחזיר את התשובה.
 */
export const chat = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { messages } = req.body as { messages: ChatMessage[] };

  const reply = await chatWithAssistant(userId, messages);

  res.json({ success: true, data: { reply } });
});
