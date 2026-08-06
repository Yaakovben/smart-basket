import { Box, Typography } from '@mui/material';
import type { ChatEntry } from '../hooks/useAiAssistantChat';

interface ChatBubbleProps {
  entry: ChatEntry;
  isDark: boolean;
}

export const ChatBubble = ({ entry, isDark }: ChatBubbleProps) => {
  const isUser = entry.role === 'user';

  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end', mb: 1.25 }}>
      <Box sx={{
        maxWidth: '80%',
        px: 1.75, py: 1.1,
        // isUser יושב מימין (flex-start ב-RTL) אז הזנב (הפינה החדה) צריך
        // להצביע ימינה-למטה, לא שמאלה - היה הפוך ונראה כאילו ההודעה
        // "שייכת" לצד השני.
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        bgcolor: entry.error
          ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
          : isUser
          ? (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6')
          : 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
        background: !isUser && !entry.error ? 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)' : undefined,
      }}>
        <Typography sx={{
          fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          color: entry.error ? (isDark ? '#FCA5A5' : '#B91C1C') : isUser ? (isDark ? '#E5E7EB' : 'text.primary') : 'white',
        }}>
          {entry.content}
        </Typography>
      </Box>
    </Box>
  );
};
