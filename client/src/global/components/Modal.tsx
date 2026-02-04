import { Dialog, DialogTitle, DialogContent, Box, Slide, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useState, useCallback } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const Modal = ({ title, onClose, children }: ModalProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    haptic('light');
    setIsClosing(true);
    // Wait for slide animation to complete
    setTimeout(() => {
      onClose();
    }, 250);
  }, [onClose]);

  return (
    <Dialog
      open={!isClosing}
      onClose={handleClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          m: 0,
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh',
          maxWidth: { xs: '100%', sm: 480 },
          width: '100%',
          pb: 'env(safe-area-inset-bottom)',
          bgcolor: 'background.paper'
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)',
          bgcolor: 'rgba(0,0,0,0.4)'
        }
      }}
    >
      {/* Handle bar */}
      <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mt: 1.5 }} />

      {/* Header with close button */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: 2, pt: 1.5, pb: 1 }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: 17, p: 0, color: 'text.primary' }}>
          {title}
        </DialogTitle>
        <IconButton
          onClick={handleClose}
          aria-label="Close"
          sx={{
            position: 'absolute',
            left: 12,
            bgcolor: 'action.hover',
            width: 40,
            height: 40,
            '&:hover': { bgcolor: 'action.selected' },
            '&:active': { transform: 'scale(0.95)' }
          }}
        >
          <CloseIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2.5, pb: 3, pt: 1.5, overflowY: 'auto' }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
