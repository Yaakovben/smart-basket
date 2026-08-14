import { useState, memo, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, IconButton, TextField } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import { AiAssistantIcon } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/helpers';
import { useAiAssistantChat } from '../hooks/useAiAssistantChat';
import { ChatBubble } from './ChatBubble';
import { AiThinkingIndicator } from './AiThinkingIndicator';

export const AiAssistantPage = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, t } = useSettings();
  const isDark = settings.theme === 'dark';
  // בחירה אקראית של 3 שאלות מוצעות מתוך 9 - שונות בכל פתיחה
  const SUGGESTIONS = useMemo(() => {
    const all = [
      t('aiSuggestion1'), t('aiSuggestion2'), t('aiSuggestion3'),
      t('aiSuggestion4'), t('aiSuggestion5'), t('aiSuggestion6'),
      t('aiSuggestion7'), t('aiSuggestion8'), t('aiSuggestion9'),
    ];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { messages, sending, sendMessage, listEndRef } = useAiAssistantChat();
  const [input, setInput] = useState('');

  // הגעה עם הקשר מוכן (למשל "נתח לי את הרשימה X" מכפתור בעמוד רשימה) -
  // שולחים אוטומטית פעם אחת בלבד. מנקים את ה-state מההיסטוריה מיד כדי
  // שרענון/back-forward לא ישלחו שוב את אותה הודעה.
  const autoSentRef = useRef(false);
  useEffect(() => {
    const initialPrompt = (location.state as { initialPrompt?: string } | null)?.initialPrompt;
    if (initialPrompt && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(initialPrompt);
      navigate(location.pathname, { replace: true, state: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* כותרת */}
      <Box sx={{
        position: 'relative',
        background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
        p: 'max(50px, env(safe-area-inset-top) + 20px) 16px 16px',
        borderRadius: '0 0 24px 24px',
        boxShadow: isDark ? '0 6px 20px rgba(0,0,0,0.35)' : '0 6px 20px rgba(15,118,110,0.18)',
        flexShrink: 0,
        zIndex: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              color: 'white', bgcolor: 'rgba(255,255,255,0.14)', width: 36, height: 36,
              transition: 'background-color 0.15s ease, transform 0.1s ease',
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.9 }}>
            <Box sx={{
              position: 'relative',
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #A78BFA 0%, #2DD4BF 100%)',
              boxShadow: '0 2px 10px rgba(139,92,246,0.5)',
              animation: 'aiHeaderPulse 2.6s ease-in-out infinite',
              '@keyframes aiHeaderPulse': {
                '0%, 100%': { boxShadow: '0 2px 10px rgba(139,92,246,0.5)' },
                '50%': { boxShadow: '0 2px 16px rgba(45,212,191,0.65)' },
              },
            }}>
              <AiAssistantIcon sx={{ color: 'white', fontSize: 17 }} />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
              {t('aiAssistantTitle')}
            </Typography>
          </Box>
          <Box sx={{ width: 36, flexShrink: 0 }} />
        </Box>
      </Box>

      {/* גוף הצ'אט - גוון רקע עדין (לא שטוח) שמדגיש את בועות הצ'אט */}
      <Box sx={{
        flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 2,
        background: isDark
          ? 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 55%)'
          : 'radial-gradient(circle at 50% 0%, rgba(20,184,166,0.05) 0%, transparent 55%)',
      }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 3, px: 1 }}>
            {/* אייקון AI מרכזי - כניסה עם "pop" גמיש, הילה פועמת ברקע וריחוף
                עדין מתמשך + שלוש נקודות מקיפות (אותה שפה ויזואלית כמו
                AiThinkingIndicator, בקנה מידה גדול יותר בתור "hero"). */}
            <Box sx={{ position: 'relative', width: 88, height: 88, mx: 'auto', mb: 2 }}>
              <Box sx={{
                position: 'absolute', inset: -12, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(20,184,166,0.22) 55%, transparent 75%)',
                filter: 'blur(6px)',
                animation: 'aiHeroGlow 2.4s ease-in-out infinite',
                '@keyframes aiHeroGlow': {
                  '0%, 100%': { opacity: 0.55, transform: 'scale(0.9)' },
                  '50%': { opacity: 1, transform: 'scale(1.12)' },
                },
              }} />
              {[
                { color: '#A78BFA', duration: '5s', delay: '0s', size: 7 },
                { color: '#2DD4BF', duration: '5s', delay: '-1.7s', size: 6 },
                { color: '#5EEAD4', duration: '5s', delay: '-3.3s', size: 5 },
              ].map((dot, i) => (
                <Box key={i} aria-hidden="true" sx={{
                  position: 'absolute', inset: -4,
                  animation: `aiHeroOrbit ${dot.duration} linear infinite`,
                  animationDelay: dot.delay,
                  '@keyframes aiHeroOrbit': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                }}>
                  <Box sx={{
                    position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                    width: dot.size, height: dot.size, borderRadius: '50%',
                    bgcolor: dot.color, boxShadow: `0 0 8px ${dot.color}`,
                  }} />
                </Box>
              ))}
              <Box sx={{
                position: 'relative', width: 88, height: 88, borderRadius: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                boxShadow: '0 10px 30px rgba(139,92,246,0.35), 0 6px 18px rgba(20,184,166,0.3)',
                animation: 'aiHeroPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both, aiHeroFloat 3.4s ease-in-out 0.55s infinite',
                '@keyframes aiHeroPop': { from: { opacity: 0, transform: 'scale(0.4) rotate(-8deg)' }, to: { opacity: 1, transform: 'scale(1) rotate(0)' } },
                '@keyframes aiHeroFloat': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
              }}>
                <AiAssistantIcon sx={{ color: 'white', fontSize: 40 }} />
              </Box>
            </Box>

            <Typography sx={{
              fontSize: 14, color: 'text.secondary', mb: 2.5, lineHeight: 1.7,
              animation: 'aiFadeUp 0.5s ease 0.25s both',
              '@keyframes aiFadeUp': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
            }}>
              {t('aiAssistantIntro')}
            </Typography>

            {/* הצעות שאלה - כל אחת "מדברת" דרך אייקון איש-מדבר בעיגול גרדיאנט,
                כדי שיהיה ברור חזותית שזו שאלה שאפשר "לשאול" בלחיצה, לא רק
                טקסט. כניסה מדורגת (stagger) לכל כרטיס, ורמז "הקש" מונפש
                שמופיע רק על ההצעה הראשונה כדי ללמד את האינטראקציה. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {SUGGESTIONS.map((s, i) => (
                <Box
                  key={s}
                  onClick={() => sendMessage(s)}
                  sx={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 1.25,
                    px: 1.5, py: 1.1, borderRadius: '16px', cursor: 'pointer',
                    textAlign: 'start',
                    bgcolor: isDark ? 'rgba(20,184,166,0.1)' : '#F0FDFA',
                    border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.25)' : '#99F6E4',
                    boxShadow: isDark ? 'none' : '0 2px 8px rgba(15,118,110,0.06)',
                    opacity: 0,
                    animation: `aiSuggestionIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.13}s both`,
                    '@keyframes aiSuggestionIn': {
                      from: { opacity: 0, transform: 'translateY(14px) scale(0.94)' },
                      to: { opacity: 1, transform: 'none' },
                    },
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >
                  <Box sx={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
                    boxShadow: '0 2px 8px rgba(20,184,166,0.35)',
                  }}>
                    <RecordVoiceOverRoundedIcon sx={{ color: 'white', fontSize: 17 }} />
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#5EEAD4' : '#0F766E', lineHeight: 1.5, flex: 1 }}>
                    {s}
                  </Typography>
                  {i === 0 && (
                    <TouchAppRoundedIcon
                      aria-hidden="true"
                      sx={{
                        flexShrink: 0, fontSize: 18, color: isDark ? 'rgba(94,234,212,0.7)' : 'rgba(15,118,110,0.55)',
                        animation: 'aiTapHint 1.6s ease-in-out 1.4s infinite',
                        '@keyframes aiTapHint': {
                          '0%, 100%': { transform: 'scale(1)', opacity: 0.5 },
                          '50%': { transform: 'scale(1.25)', opacity: 1 },
                        },
                      }}
                    />
                  )}
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
              <Box sx={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 0.9, mb: 1.5 }}>
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
        bgcolor: 'background.paper',
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
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              bgcolor: isDark ? 'rgba(30,41,59,0.6)' : '#F8FAFB',
              minHeight: 44,
              transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
              '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)' },
              '&:hover fieldset': { borderColor: isDark ? 'rgba(94,234,212,0.35)' : 'rgba(20,184,166,0.35)' },
              '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(20,184,166,0.15)' },
              '&.Mui-focused fieldset': { borderColor: '#14B8A6', borderWidth: '1.5px' },
            },
          }}
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
