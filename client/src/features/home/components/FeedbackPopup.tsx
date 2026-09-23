import { useState } from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import { feedbackApi } from '../../../services/api/feedback.api';
import type { ToastType } from '../../../global/types';

interface FeedbackPopupProps {
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

const STAR_COLOR = '#F59E0B';
const RATING_LABEL_KEYS = ['feedbackRating1', 'feedbackRating2', 'feedbackRating3', 'feedbackRating4', 'feedbackRating5'] as const;

// דירוג 1-5 כוכבים + טקסט חופשי "מה אפשר לייעל" - נשמר ב-DB (feedback.api)
// כדי שהאדמין יראה את זה בפאנל, לא רק מייל בודד שקל לפספס (ראו
// feedback.service.ts בשרת). חד-פעמי לכל משתמש - ראו useFeedbackPopup.
export const FeedbackPopup = ({ onClose, showToast }: FeedbackPopupProps) => {
  const { t } = useSettings();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!rating || sending) return;
    haptic('medium');
    setSending(true);
    try {
      await feedbackApi.submit(rating, text);
      showToast(t('feedbackThanks'), 'success');
      onClose();
    } catch {
      showToast(t('errorOccurred'), 'error');
      setSending(false);
    }
  };

  const shownRating = hoverRating || rating;

  return (
    <Modal
      title={t('feedbackTitle')}
      onClose={onClose}
      footer={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            disabled={sending}
            onClick={() => { haptic('light'); onClose(); }}
            sx={{ borderRadius: '12px', py: 1.1, textTransform: 'none', fontWeight: 600 }}
          >
            {t('feedbackMaybeLater')}
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={!rating || sending}
            onClick={handleSend}
            sx={{ borderRadius: '12px', py: 1.1, textTransform: 'none', fontWeight: 700 }}
          >
            {sending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : t('feedbackSend')}
          </Button>
        </Box>
      }
    >
      <Box sx={{ textAlign: 'center', mb: 2.5 }}>
        <Box sx={{ fontSize: 40, mb: 1 }}>💬</Box>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', px: 1, lineHeight: 1.5 }}>
          {t('feedbackDescription')}
        </Typography>
      </Box>

      {/* דירוג - חמישה כוכבים גדולים ומרווחים, קלים לפגיעה באצבע.
          תווית מתחתם משתנה לפי הבחירה כדי שהמספר יתורגם למילה ברורה,
          לא רק "3 מתוך 5" יבש. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, mb: 3 }}>
        <Box role="radiogroup" aria-label={t('feedbackRatingAria')} sx={{ display: 'flex', gap: 0.5 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Box
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={t(RATING_LABEL_KEYS[n - 1])}
              tabIndex={0}
              onClick={() => { haptic('light'); setRating(n); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); setRating(n); } }}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              sx={{
                width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.12s ease',
                '&:active': { transform: 'scale(0.88)' },
              }}
            >
              <StarRoundedIcon
                sx={{
                  fontSize: 34,
                  color: n <= shownRating ? STAR_COLOR : 'action.disabledBackground',
                  transition: 'color 0.15s ease',
                }}
              />
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: shownRating ? STAR_COLOR : 'text.disabled', minHeight: 18 }}>
          {shownRating ? t(RATING_LABEL_KEYS[shownRating - 1]) : t('feedbackRatingPrompt')}
        </Typography>
      </Box>

      <TextField
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('feedbackPlaceholder')}
        multiline
        minRows={4}
        maxRows={8}
        fullWidth
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px', fontSize: 14 } }}
      />
    </Modal>
  );
};
