/// <reference types="vite/client" />

declare const __BUILD_VERSION__: string;

// Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
// declare var נדרש עבור global declarations ב-d.ts - ESLint לא ממיר אותו ל-let/const
// eslint-disable-next-line no-var
declare var SpeechRecognition: { new(): SpeechRecognition };
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

// Launch Handler API - עדיין לא ב-lib.dom.d.ts הרגיל. נצרך ב-router/index.tsx
// כדי לקלוט קישורי /join כשה-PWA כבר פתוח (launch_handler.client_mode:
// 'focus-existing' ב-vite.config.ts) בלי ניווט/רענון מסמך אמיתי.
// files תמיד ריק במקרה שלנו (לא Web Share Target) - לא צריך FileSystemHandle.
interface LaunchParams {
  readonly targetURL: string | null;
  readonly files: readonly unknown[];
}
interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}
interface Window {
  launchQueue?: LaunchQueue;
}
