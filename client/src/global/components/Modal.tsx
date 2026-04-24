import { Dialog, DialogTitle, DialogContent, Box, Slide, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useCallback } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  // נעילת גלילת ה-body כל עוד המודאל פתוח - מונע 'scroll chaining' ב-iOS
  useBodyScrollLock(true);

  const handleClose = useCallback(() => {
    haptic('light');
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
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
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
        },
        '& .MuiBackdrop-root': {
          backdropFilter: 'blur(4px)',
          bgcolor: 'rgba(0,0,0,0.4)'
        }
      }}
    >
      {/* ידית גרירה */}
      <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mt: 1.5 }} />

      {/* כותרת וכפתור סגירה */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: 2, pt: 1.5, pb: 1, minHeight: 44 }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: 17, p: 0, color: 'text.primary' }}>
          {title}
        </DialogTitle>
        <IconButton
          // preventDefault ב-mousedown מונע מה-input לאבד פוקוס, ולכן ה-onClick נורה בלחיצה הראשונה
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleClose}
          aria-label="Close"
          disableRipple
          disableFocusRipple
          sx={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'action.hover',
            width: 44,
            height: 44,
            zIndex: 2,
            touchAction: 'manipulation',
            transition: 'opacity 0.1s, background-color 0.15s',
            '&:hover': { bgcolor: 'action.hover' },
            '&:active': { opacity: 0.7, bgcolor: 'action.selected' },
          }}
        >
          <CloseIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 2.5, pb: 3, pt: 1.5, overflowY: 'auto', overscrollBehavior: 'contain', borderTop: 'none', '&.MuiDialogContent-dividers': { borderTop: 'none' }, '&::before': { display: 'none' } }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
