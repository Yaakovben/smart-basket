import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Zoom } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useState, useCallback } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';
import { useSettings } from '../context/SettingsContext';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
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
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirm = useCallback(() => {
    haptic('medium');
    setIsClosing(true);
    // Wait for animation to complete before calling onConfirm
    setTimeout(() => {
      onConfirm();
    }, 200);
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    haptic('light');
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

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
          m: 'auto'
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
      <DialogTitle id="confirm-dialog-title" sx={{ p: 0, mb: 1.5, textAlign: 'center', fontWeight: 700, fontSize: 18, color: 'text.primary' }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ p: 0, mb: 3 }}>
        <Typography id="confirm-dialog-description" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 15, whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 0, gap: 1.5 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          fullWidth
          disabled={isClosing}
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
          disabled={isClosing}
        >
          {confirmText || t('confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
