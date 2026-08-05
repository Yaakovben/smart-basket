import { useEffect, useState } from 'react';
import { getSessionHistory, clearSessionHistory } from '../helpers/crashLog';

interface SessionLog {
  start: number;
  entries: { t: number; msg: string }[];
}

// מציג את היסטוריית הסשנים האחרונים (ראו crashLog.ts) ישירות על המסך,
// בפתיחה הבאה של האפליקציה - כדי לחקור "האפליקציה נסגרת לבד" ב-iOS PWA
// בלי צורך במחשב/Web Inspector. שומר כמה סשנים (לא רק "הקודם") כי פתיחה
// נוספת בין קריסה לבין קריאת הלוג הייתה מוחקת את הראיה האמיתית.
//
// סשן "נראה כמו קריסה" אם הוא לא מסתיים באחד מהאירועים שמעידים על סגירה
// מבוקרת (pagehide/beforeunload/visibilitychange->hidden) - כלומר היומן
// פשוט נעצר באמצע, בלי שום סימן ליציאה יזומה.
const CLEAN_EXIT_MARKERS = ['pagehide fired', 'beforeunload fired', 'visibilitychange -> hidden'];

function looksLikeCrash(session: SessionLog): boolean {
  if (session.entries.length === 0) return false;
  const last = session.entries[session.entries.length - 1];
  return !CLEAN_EXIT_MARKERS.some(marker => last.msg.includes(marker));
}

function formatSession(session: SessionLog, index: number): string {
  const last = session.entries[session.entries.length - 1];
  const crash = looksLikeCrash(session);
  const header = `--- Session #${index + 1} (${new Date(session.start).toISOString()}) - lasted ${(last.t / 1000).toFixed(1)}s - ${crash ? '⚠️ LOOKS LIKE A CRASH (no clean exit)' : 'clean exit'} ---`;
  const body = session.entries.map(e => `+${(e.t / 1000).toFixed(2)}s  ${e.msg}`).join('\n');
  return `${header}\n${body}`;
}

// זמני בכוונה - להסיר אחרי שהבאג נפתר ומאומת.
export function CrashLogViewer() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // הסשן האחרון בהיסטוריה הוא הנוכחי (עדיין רץ) - לא מציגים אותו,
    // רק סשנים שכבר הסתיימו (כל מה שלפניו).
    const all = getSessionHistory();
    setSessions(all.slice(0, -1));
  }, []);

  if (sessions.length === 0) return null;

  const crashCount = sessions.filter(looksLikeCrash).length;
  const text = [
    `Smart Basket - last ${sessions.length} session(s)`,
    `${crashCount} of them look like a crash (no clean exit event)`,
    '',
    ...sessions.map((s, i) => formatSession(s, i)),
  ].join('\n\n');

  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  };

  const handleDismiss = () => {
    clearSessionHistory();
    setSessions([]);
  };

  return (
    <div
      dir="ltr"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(10, 15, 20, 0.97)',
        color: '#7CFC9A',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        {sessions.length} recent session(s) - {crashCount > 0 ? `⚠️ ${crashCount} look like crashes` : 'all clean exits'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          onClick={handleCopy}
          style={{ background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}
        >
          {copied ? 'Copied ✓' : 'Copy log'}
        </button>
        <button
          onClick={handleDismiss}
          style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}
        >
          Dismiss
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
        {text}
      </div>
    </div>
  );
}
