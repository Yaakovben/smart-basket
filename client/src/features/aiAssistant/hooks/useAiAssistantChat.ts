import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAssistantApi, AiAssistantStreamError, type AiChatMessage } from '../../../services/api';
import { useSettings } from '../../../global/context/SettingsContext';

export interface ChatEntry extends AiChatMessage {
  id: string;
  error?: boolean;
  fallback?: boolean;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ממיר resetAt (ISO string מהשרת) למספר דקות עגול עד האיפוס, לא פחות מ-1
// כדי שלא נציג "בעוד 0 דקות" רגע לפני שהמכסה בפועל מתחדשת.
function minutesUntil(resetAt: string | null | undefined): number | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / 60_000));
}

// ניהול שיחת הצ'אט: היסטוריה, שליחה, מצב טעינה. שולח את כל ההיסטוריה
// לשרת בכל פנייה (לא session בצד שרת) - כך אין state לנהל בין בקשות,
// והשרת נשאר stateless כמו שאר ה-API.
export function useAiAssistantChat() {
  const { t } = useSettings();
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
    // אם ה-meta.fallback מגיע (כמעט תמיד) לפני ה-delta הראשון, מסמנים כאן
    // ומצרפים ל-entry ברגע שהוא נוצר. אם הוא כבר קיים (מקרה קצה נדיר של
    // תזמון), מעדכנים אותו ישירות.
    let fallbackFlag = false;

    try {
      // ההיסטוריה שנשלחת לשרת - כולל ההודעה החדשה, בלי שדות פנימיים (id/error)
      const history: AiChatMessage[] = [...messages, userEntry].map(({ role, content }) => ({ role, content }));
      await aiAssistantApi.chatStream(
        history,
        (delta) => {
          if (!started) {
            started = true;
            // ברגע שמגיע טקסט אמיתי - מפסיקים להראות את אינדיקטור "חושב"
            setSending(false);
            setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: delta, fallback: fallbackFlag }]);
          } else {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + delta } : m));
          }
        },
        () => {
          fallbackFlag = true;
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, fallback: true } : m));
        }
      );
      if (!started) {
        setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: t('aiNoResponse'), error: true }]);
      }
    } catch (err) {
      const status = err instanceof AiAssistantStreamError ? err.status : undefined;
      const minutes = err instanceof AiAssistantStreamError ? minutesUntil(err.resetAt) : null;
      const errorText = status === 503
        ? t('aiNotConfigured')
        : status === 429
        ? t('aiTooManyMessages') + (minutes ? ` ${t('aiTryAgainInMinutes').replace('{minutes}', String(minutes))}` : '')
        : t('aiGenericError');
      // אם כבר התחיל להגיע טקסט לפני שהחיבור נקטע - משאירים אותו ומוסיפים
      // הודעת שגיאה נפרדת, במקום למחוק תשובה חלקית שכבר הוצגה למשתמש.
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: errorText, error: true }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, t]);

  return { messages, sending, sendMessage, listEndRef };
}
