import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAssistantApi, AiAssistantStreamError, type AiChatMessage } from '../../../services/api';

export interface ChatEntry extends AiChatMessage {
  id: string;
  error?: boolean;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ניהול שיחת הצ'אט: היסטוריה, שליחה, מצב טעינה. שולח את כל ההיסטוריה
// לשרת בכל פנייה (לא session בצד שרת) - כך אין state לנהל בין בקשות,
// והשרת נשאר stateless כמו שאר ה-API.
export function useAiAssistantChat() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userEntry: ChatEntry = { id: makeId(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userEntry]);
    setSending(true);

    // מזהה קבוע מראש לבועת התשובה - נוצרת רק כשמגיע ה-delta הראשון (started),
    // ואז ממשיכה להתעדכן delta-אחר-delta באותה בועה עד שה-stream מסתיים.
    const assistantId = makeId();
    let started = false;

    try {
      // ההיסטוריה שנשלחת לשרת - כולל ההודעה החדשה, בלי שדות פנימיים (id/error)
      const history: AiChatMessage[] = [...messages, userEntry].map(({ role, content }) => ({ role, content }));
      await aiAssistantApi.chatStream(history, (delta) => {
        if (!started) {
          started = true;
          // ברגע שמגיע טקסט אמיתי - מפסיקים להראות את אינדיקטור "חושב"
          setSending(false);
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: delta }]);
        } else {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + delta } : m));
        }
      });
      if (!started) {
        setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: 'לא התקבלה תשובה, נסה שוב.', error: true }]);
      }
    } catch (err) {
      const status = err instanceof AiAssistantStreamError ? err.status : undefined;
      const errorText = status === 503
        ? 'עוזר ה-AI לא מוגדר כרגע בשרת.'
        : status === 429
        ? 'יותר מדי הודעות בשעה האחרונה - נסה שוב מאוחר יותר.'
        : 'משהו השתבש, נסה שוב.';
      // אם כבר התחיל להגיע טקסט לפני שהחיבור נקטע - משאירים אותו ומוסיפים
      // הודעת שגיאה נפרדת, במקום למחוק תשובה חלקית שכבר הוצגה למשתמש.
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: errorText, error: true }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  return { messages, sending, sendMessage, listEndRef };
}
