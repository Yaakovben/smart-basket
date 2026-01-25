import { Dialog, DialogTitle, DialogContent, Box, Slide } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef } from 'react';
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
  const handleClose = () => {
    haptic('light');
    onClose();
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          m: 0,
          borderRadius: '24px 24px 0 0',
          maxHeight: '85vh',
          maxWidth: { xs: '100%', sm: 500, md: 600 },
          width: '100%'
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)'
        }
      }}
    >
      <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mt: 1.5, mb: 2 }} />
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: 18, p: 0, mb: 2.5 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pb: 4 }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
