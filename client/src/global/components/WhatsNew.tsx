import { Dialog, DialogTitle, DialogContent, Box, Slide, Button, Typography, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { TransitionProps } from '@mui/material/transitions';
import { forwardRef, useState, useCallback } from 'react';
import type { ReactElement, Ref } from 'react';
import { haptic } from '../helpers';
import type { ChangelogEntry } from '../hooks/useVersion';

interface WhatsNewProps {
  open: boolean;
  version: string;
  changes: ChangelogEntry[];
  onClose: () => void;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const WhatsNew = ({ open, version, changes, onClose }: WhatsNewProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    haptic('light');
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  }, [onClose]);

  if (!open || changes.length === 0) return null;

  return (
    <Dialog
      open={open && !isClosing}
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
          maxHeight: '85vh',
          maxWidth: { xs: '100%', sm: 480 },
          width: '100%',
          pb: 'env(safe-area-inset-bottom)',
          bgcolor: 'background.paper',
          overflow: 'hidden',
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

      {/* Header with icon */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, pb: 1 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)',
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 28, color: 'white' }} />
        </Box>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontSize: 20, p: 0, color: 'text.primary' }}>
          מה חדש? 🎉
        </DialogTitle>
        <Chip
          label={`גרסה ${version}`}
          size="small"
          sx={{
            mt: 1,
            bgcolor: 'primary.main',
            color: 'white',
            fontWeight: 600,
            fontSize: 12,
          }}
        />
      </Box>

      <DialogContent sx={{ px: 2.5, pb: 2, pt: 1, overflowY: 'auto' }}>
        {changes.map((entry, index) => (
          <Box key={entry.version} sx={{ mb: index < changes.length - 1 ? 3 : 0 }}>
            {/* Show version header only if multiple versions */}
            {changes.length > 1 && (
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'text.secondary',
                  mb: 1,
                }}
              >
                {entry.title} • {entry.date}
              </Typography>
            )}

            {/* Changes list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {entry.changes.map((change, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.25 }} />
                  <Typography sx={{ fontSize: 14, color: 'text.primary', lineHeight: 1.5 }}>
                    {change}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}

        <Button
          variant="contained"
          fullWidth
          onClick={handleClose}
          sx={{
            mt: 3,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            fontSize: 15,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
            },
          }}
        >
          מעולה, בואו נתחיל! ✨
        </Button>
      </DialogContent>
    </Dialog>
  );
};
