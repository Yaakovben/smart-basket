import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Zoom, CircularProgress } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useState, useCallback } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';
import { useSettings } from '../context/SettingsContext';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Zoom ref={ref} {...props} />;
});

export const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText }: ConfirmModalProps) => {
  const { t } = useSettings();
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirm = useCallback(async () => {
    haptic('medium');
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setIsClosing(true);
      setTimeout(() => {
        onCancel();
      }, 200);
    }
  }, [onConfirm, onCancel]);

  const handleCancel = useCallback(() => {
    if (loading) return;
    haptic('light');
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel, loading]);

  return (
    <Dialog
      open={!isClosing}
      onClose={handleCancel}
      TransitionComponent={Transition}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: '20px',
          p: 3,
          width: '90%',
          maxWidth: 320,
          position: 'relative',
          bottom: 'auto',
          m: 'auto',
          '@media (max-width: 360px)': { p: 2, borderRadius: '16px', width: '94%' },
          '@media (max-width: 320px)': { p: 1.5, borderRadius: '14px', width: '96%' },
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)'
        },
        '& .MuiDialog-container': {
          alignItems: 'center'
        }
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{
        p: 0, mb: 1.5, textAlign: 'center', fontWeight: 700, fontSize: 18, color: 'text.primary',
        '@media (max-width: 360px)': { fontSize: 16, mb: 1 },
        '@media (max-width: 320px)': { fontSize: 15, mb: 0.75 },
      }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{
        p: 0, mb: 3,
        '@media (max-width: 360px)': { mb: 2 },
        '@media (max-width: 320px)': { mb: 1.5 },
      }}>
        <Typography id="confirm-dialog-description" sx={{
          textAlign: 'center', color: 'text.secondary', fontSize: 15, whiteSpace: 'pre-line',
          '@media (max-width: 360px)': { fontSize: 13.5 },
          '@media (max-width: 320px)': { fontSize: 12.5 },
        }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 0, gap: 1.5 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          fullWidth
          disabled={isClosing || loading}
          sx={{
            borderColor: 'divider',
            borderWidth: 2,
            color: 'text.primary',
            '&:hover': { borderColor: 'divider', borderWidth: 2, bgcolor: 'action.hover' }
          }}
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          fullWidth
          disabled={isClosing || loading}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : (confirmText || t('confirm'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
