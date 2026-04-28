import { Dialog, DialogTitle, DialogContent, Box, Slide, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useCallback } from 'react';
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
  // נעילת ה-body מטופלת אוטומטית ע"י MUI Dialog (disableScrollLock=false ברירת מחדל).
  // אסור להוסיף נעילה משלנו - שתי שכבות נועלות מתנגשות וגורמות לתוכן הפנימי להיחתך.
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
          bgcolor: 'background.paper',
          // מסכים זעירים - radius קטן יותר
          '@media (max-width: 360px)': { borderRadius: '16px 16px 0 0' },
          '@media (max-width: 320px)': { borderRadius: '14px 14px 0 0' },
          // Landscape - גובה גבול 95vh כי המסך נמוך
          '@media (orientation: landscape) and (max-height: 500px)': { maxHeight: '95vh' },
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
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        px: 2, pt: 1.5, pb: 1, minHeight: 44,
        '@media (max-width: 360px)': { px: 1.5, pt: 1, pb: 0.75, minHeight: 38 },
        '@media (max-width: 320px)': { px: 1, pt: 0.75, pb: 0.5, minHeight: 34 },
      }}>
        <DialogTitle sx={{
          textAlign: 'center', fontWeight: 700, fontSize: 17, p: 0, color: 'text.primary',
          '@media (max-width: 360px)': { fontSize: 15 },
          '@media (max-width: 320px)': { fontSize: 14 },
        }}>
          {title}
        </DialogTitle>
        <IconButton
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
            // ויזואלית קטן יותר ב-360, אבל tap-target מורחב דרך ::before
            '@media (max-width: 360px)': {
              width: 32, height: 32, left: 6,
              position: 'absolute',
              '&::before': { content: '""', position: 'absolute', inset: '-6px' },
            },
            '@media (max-width: 320px)': {
              width: 28, height: 28, left: 4,
              '&::before': { content: '""', position: 'absolute', inset: '-8px' },
            },
          }}
        >
          <CloseIcon sx={{
            fontSize: 22, color: 'text.secondary',
            '@media (max-width: 360px)': { fontSize: 18 },
            '@media (max-width: 320px)': { fontSize: 16 },
          }} />
        </IconButton>
      </Box>

      <DialogContent sx={{
        px: 2.5, pb: 3, pt: 1.5,
        overflowY: 'auto', overscrollBehavior: 'contain',
        borderTop: 'none',
        '&.MuiDialogContent-dividers': { borderTop: 'none' },
        '&::before': { display: 'none' },
        '@media (max-width: 360px)': { px: 1.75, pb: 2, pt: 1 },
        '@media (max-width: 320px)': { px: 1.25, pb: 1.5, pt: 0.75 },
      }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};
