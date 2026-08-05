import { useEffect, useState } from 'react';
import { getPreviousSessionLog, clearPreviousSessionLog } from '../helpers/crashLog';

// מציג את יומן האבחון של הסשן הקודם (ראו crashLog.ts) ישירות על המסך,
// בפתיחה הבאה של האפליקציה - כדי לחקור "האפליקציה נסגרת לבד" ב-iOS PWA
// בלי צורך במחשב/Web Inspector. משתמש יכול להעתיק את הטקסט ולשלוח אותו.
//
// זמני בכוונה - להסיר אחרי שהבאג נפתר ומאומת.
export function CrashLogViewer() {
  const [log, setLog] = useState<{ start: number; entries: { t: number; msg: string }[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLog(getPreviousSessionLog());
  }, []);

  if (!log || log.entries.length === 0) return null;

  const lastEntry = log.entries[log.entries.length - 1];
  const durationSec = Math.round(lastEntry.t / 1000);
  const text = [
    `Smart Basket - previous session log`,
    `session started: ${new Date(log.start).toISOString()}`,
    `session lasted at least ${durationSec}s before this log was captured`,
    ``,
    ...log.entries.map(e => `+${(e.t / 1000).toFixed(2)}s  ${e.msg}`),
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  };

  const handleDismiss = () => {
    clearPreviousSessionLog();
    setLog(null);
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
        Previous session log (lasted ~{durationSec}s)
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
