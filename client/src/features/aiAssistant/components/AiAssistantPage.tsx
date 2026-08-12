import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, TextField } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import { AiAssistantIcon } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/helpers';
import { useAiAssistantChat } from '../hooks/useAiAssistantChat';
import { ChatBubble } from './ChatBubble';
import { AiThinkingIndicator } from './AiThinkingIndicator';

export const AiAssistantPage = memo(() => {
  const navigate = useNavigate();
  const { settings, t } = useSettings();
  const isDark = settings.theme === 'dark';
  const SUGGESTIONS = [t('aiSuggestion1'), t('aiSuggestion2'), t('aiSuggestion3')];
  const { messages, sending, sendMessage, listEndRef } = useAiAssistantChat();
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* כותרת */}
      <Box sx={{
        background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
        p: 'max(50px, env(safe-area-inset-top) + 20px) 16px 16px',
        borderRadius: '0 0 24px 24px',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', width: 36, height: 36 }}>
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
            }}>
              <AiAssistantIcon sx={{ color: 'white', fontSize: 16 }} />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
              {t('aiAssistantTitle')}
            </Typography>
          </Box>
          <Box sx={{ width: 36, flexShrink: 0 }} />
        </Box>
      </Box>

      {/* גוף הצ'אט */}
      <Box sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
              boxShadow: '0 8px 22px rgba(139,92,246,0.3), 0 4px 14px rgba(20,184,166,0.3)',
            }}>
              <AiAssistantIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2.5, lineHeight: 1.7 }}>
              {t('aiAssistantIntro')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {SUGGESTIONS.map(s => (
                <Box
                  key={s}
                  onClick={() => sendMessage(s)}
                  sx={{
                    px: 2, py: 1.25, borderRadius: '14px', cursor: 'pointer',
                    bgcolor: isDark ? 'rgba(20,184,166,0.1)' : '#F0FDFA',
                    border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.25)' : '#99F6E4',
                    fontSize: 13, fontWeight: 600, color: isDark ? '#5EEAD4' : '#0F766E',
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map(entry => (
              <ChatBubble key={entry.id} entry={entry} isDark={isDark} />
            ))}
            {sending && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.25 }}>
                <AiThinkingIndicator />
              </Box>
            )}
          </>
        )}
        <div ref={listEndRef} />
      </Box>

      {/* שורת קלט */}
      <Box sx={{
        display: 'flex', gap: 1, alignItems: 'flex-end',
        p: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('aiAssistantPlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '18px', bgcolor: isDark ? 'rgba(30,41,59,0.6)' : '#F8FAFB', minHeight: 44 } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || sending}
          sx={{
            width: 44, height: 44, flexShrink: 0, color: 'white',
            background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
            boxShadow: '0 4px 14px rgba(20,184,166,0.4)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
            '&:hover': { boxShadow: '0 6px 18px rgba(20,184,166,0.5)' },
            '&:active': { transform: 'scale(0.92)' },
            '&.Mui-disabled': {
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)',
              boxShadow: 'none',
            },
          }}
        >
          {/* SendIcon מוצמד אופקית (scaleX) - חץ שמצביע ימינה כברירת מחדל
              הופך לשמאלה, תואם לכיוון RTL ולמיקום הכפתור בקצה השורה. */}
          <SendIcon sx={{ fontSize: 21, transform: 'scaleX(-1)' }} />
        </IconButton>
      </Box>
    </Box>
  );
});

AiAssistantPage.displayName = 'AiAssistantPage';
