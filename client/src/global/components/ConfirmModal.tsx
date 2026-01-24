import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Zoom } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';

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

export const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'אישור' }: ConfirmModalProps) => {
  return (
    <Dialog
      open
      onClose={onCancel}
      TransitionComponent={Transition}
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
      <DialogTitle sx={{ p: 0, mb: 1.5, textAlign: 'center', fontWeight: 700, fontSize: 18, color: '#111827' }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ p: 0, mb: 3 }}>
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 15 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 0, gap: 1.5 }}>
        <Button
          onClick={() => { haptic('light'); onCancel(); }}
          variant="outlined"
          fullWidth
          sx={{
            borderColor: '#E5E7EB',
            borderWidth: 2,
            color: 'text.primary',
            '&:hover': { borderColor: '#E5E7EB', borderWidth: 2, bgcolor: '#F9FAFB' }
          }}
        >
          ביטול
        </Button>
        <Button
          onClick={() => { haptic('medium'); onConfirm(); }}
          variant="contained"
          color="error"
          fullWidth
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
