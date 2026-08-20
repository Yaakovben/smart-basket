import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import { AiAssistantIcon, MemberAvatar } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { renderInlineBold } from '../../../global/helpers';
import type { User } from '../../../global/types';
import type { ChatEntry } from '../hooks/useAiAssistantChat';

interface ChatBubbleProps {
  entry: ChatEntry;
  isDark: boolean;
}

// קריאה קלה מה-cache המקומי בלבד - בלי useAuth המלא, רק כדי להציג את
// האווטאר האמיתי של המשתמש ליד ההודעות שלו (אותו פתרון כמו בפופאפ
// "המיקום שלי" במפת הסניפים).
function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem('cached_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const ChatBubble = ({ entry, isDark }: ChatBubbleProps) => {
  const isUser = entry.role === 'user';
  const currentUser = useMemo(getCachedUser, []);
  const { t } = useSettings();

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{
        display: 'flex',
        flexDirection: isUser ? 'row' : 'row-reverse',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        gap: 0.9,
        animation: 'chatBubbleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        '@keyframes chatBubbleIn': {
          from: { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}>
        {/* אווטאר - AI בעיגול גרדיאנט קבוע, משתמש עם האווטאר האמיתי שלו */}
        {isUser ? (
          currentUser ? (
            <MemberAvatar member={currentUser} size={26} />
          ) : (
            <Box sx={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            }} />
          )
        ) : (
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
            boxShadow: '0 2px 6px rgba(20,184,166,0.35)',
          }}>
            <AiAssistantIcon sx={{ color: 'white', fontSize: 14 }} />
          </Box>
        )}

        <Box sx={{
          maxWidth: '78%',
          px: 1.85, py: 1.15,
          // isUser יושב מימין (flex-start ב-RTL) אז הזנב (הפינה החדה) צריך
          // להצביע ימינה-למטה, לא שמאלה - היה הפוך ונראה כאילו ההודעה
          // "שייכת" לצד השני.
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          boxShadow: entry.error
            ? 'none'
            : isUser
            ? (isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(15,23,42,0.06)')
            : '0 4px 14px rgba(20,184,166,0.28), 0 2px 6px rgba(139,92,246,0.15)',
          bgcolor: entry.error
            ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
            : isUser
            ? (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6')
            : undefined,
          background: !isUser && !entry.error ? 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' : undefined,
          border: entry.error ? '1px solid' : 'none',
          borderColor: entry.error ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA') : undefined,
        }}>
          <Typography sx={{
            fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: entry.error ? (isDark ? '#FCA5A5' : '#B91C1C') : isUser ? (isDark ? '#E5E7EB' : 'text.primary') : 'white',
          }}>
            {isUser ? entry.content : renderInlineBold(entry.content)}
          </Typography>
        </Box>
      </Box>

      {/* חיווי עדין - התשובה הזו הגיעה ממודל גיבוי (הספק הראשי נכשל/נגמרה
          לו המכסה). מוצג רק כשרלוונטי, לא כשגיאה - השירות עדיין עבד. */}
      {entry.fallback && !isUser && (
        <Box sx={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.4,
          mt: 0.4, pe: 4.25,
        }}>
          <SyncAltRoundedIcon sx={{ fontSize: 12, color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.7)' }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.85)' }}>
            {t('aiFallbackNotice')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
