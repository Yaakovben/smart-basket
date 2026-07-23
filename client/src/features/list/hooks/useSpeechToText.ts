import { useState, useRef, useEffect, useCallback } from 'react';
import { haptic } from '../../../global/helpers';

interface UseSpeechToTextParams {
  language: 'he' | 'en' | 'ru';
  // ערך הטקסט המזוהה מוצג בזמן אמת בתוך שדה הקלט
  setValue: (value: string) => void;
  onFinalResult?: (text: string) => void;
}

// עטיפת Web Speech API להוספה קולית מהירה - רק Chrome/Edge/Android,
// לא Safari/iOS (מדווח תמיכה אבל לא עובד בפועל).
export const useSpeechToText = ({ language, setValue, onFinalResult }: UseSpeechToTextParams) => {
  const [isListening, setIsListening] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isApple = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  const SpeechRecognitionClass = !isApple && typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const speechSupported = !!SpeechRecognitionClass;

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const toggleSpeech = useCallback(() => {
    if (micDenied) {
      alert(language === 'he'
        ? 'הגישה למיקרופון נחסמה.\nכדי לאפשר:\n1. לחץ על סמל המנעול ליד כתובת האתר\n2. הרשאות ← מיקרופון ← אפשר\n3. רענן את הדף'
        : language === 'ru'
        ? 'Доступ к микрофону заблокирован.\nЧтобы разрешить:\n1. Нажмите на значок замка рядом с URL\n2. Разрешения → Микрофон → Разрешить\n3. Обновите страницу'
        : 'Microphone access was blocked.\nTo allow:\n1. Click the lock icon near the URL\n2. Permissions → Microphone → Allow\n3. Refresh the page');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!SpeechRecognitionClass) return;
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionClass();
    recognition.lang = language === 'he' ? 'he-IL' : language === 'ru' ? 'ru-RU' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      const text = result?.[0]?.transcript?.trim();
      if (!text) return;
      // הצגת טקסט בזמן אמת
      setValue(text);
      // הוספה אוטומטית רק כשהתוצאה סופית
      if (result.isFinal && text.length >= 2 && onFinalResult) {
        setTimeout(() => {
          onFinalResult(text);
          setValue('');
          haptic('light');
        }, 200);
      }
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = (event: Event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const error = (event as { error?: string }).error;
      if (error === 'not-allowed') {
        setMicDenied(true);
        alert(language === 'he'
          ? 'הגישה למיקרופון נחסמה.\nכדי לאפשר:\n1. לחץ על סמל המנעול ליד כתובת האתר\n2. הרשאות ← מיקרופון ← אפשר\n3. רענן את הדף'
          : 'Microphone access was blocked.\nTo allow:\n1. Click the lock icon near the URL\n2. Permissions → Microphone → Allow\n3. Refresh the page');
      } else if (error === 'network') {
        alert(language === 'he' ? 'שגיאת רשת. בדוק חיבור לאינטרנט' : 'Network error. Check internet connection');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      haptic('medium');
    } catch {
      setMicDenied(true);
    }
  }, [isListening, micDenied, language, onFinalResult, SpeechRecognitionClass, setValue]);

  return { isListening, micDenied, speechSupported, toggleSpeech };
};
