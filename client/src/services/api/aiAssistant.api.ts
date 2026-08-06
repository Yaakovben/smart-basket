import apiClient from './client';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiAssistantApi = {
  /** שולח היסטוריית שיחה לעוזר ה-AI, מחזיר את תשובת ה-assistant. */
  async chat(messages: AiChatMessage[]): Promise<string> {
    const response = await apiClient.post<{ data: { reply: string } }>('/ai-assistant/chat', { messages });
    return response.data.data.reply;
  },
};
