import { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';

interface FeedbackPopupProps {
  onClose: () => void;
}

const SUPPORT_EMAIL = 'smartbasket129@gmail.com';

// פופאפ "ספרו לנו מה דעתכם" - נשלח כמייל (אותו ערוץ כמו "צור קשר"
// בהגדרות, בלי צורך בשרת/DB ייעודי למשוב).
export const FeedbackPopup = ({ onClose }: FeedbackPopupProps) => {
  const { t } = useSettings();
  const [text, setText] = useState('');

  const handleSend = () => {
    haptic('medium');
    const subject = encodeURIComponent('Smart Basket - משוב מהמשתמשים');
    const body = encodeURIComponent(text);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    onClose();
  };

  return (
    <Modal
      title={t('feedbackTitle')}
      onClose={onClose}
      footer={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => { haptic('light'); onClose(); }}
            sx={{ borderRadius: '12px', py: 1.1, textTransform: 'none', fontWeight: 600 }}
          >
            {t('feedbackMaybeLater')}
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={!text.trim()}
            onClick={handleSend}
            sx={{ borderRadius: '12px', py: 1.1, textTransform: 'none', fontWeight: 700 }}
          >
            {t('feedbackSend')}
          </Button>
        </Box>
      }
    >
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Box sx={{ fontSize: 40, mb: 1 }}>💬</Box>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', px: 1, lineHeight: 1.5 }}>
          {t('feedbackDescription')}
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
        autoFocus
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px', fontSize: 14 } }}
      />
    </Modal>
  );
};
