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
          borderRadius: { xs: '20px 20px 0 0', sm: '24px 24px 0 0' },
          maxHeight: { xs: '92vh', sm: '85vh' },
          maxWidth: { xs: '100%', sm: 500, md: 600 },
          width: '100%',
          pb: 'env(safe-area-inset-bottom)'
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)'
        }
      }}
    >
      <Box sx={{ width: { xs: 36, sm: 40 }, height: { xs: 3.5, sm: 4 }, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mt: { xs: 1.25, sm: 1.5 }, mb: { xs: 1.75, sm: 2 } }} />
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: { xs: 16, sm: 18 }, p: 0, mb: { xs: 2, sm: 2.5 } }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 3, sm: 4 }, overflowY: 'auto' }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
