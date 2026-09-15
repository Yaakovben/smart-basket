import { memo, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedAreaSx } from './listSettingsCardSx';

interface ConvertToPrivateSectionProps {
  onConvertToPrivate: () => void | Promise<void>;
  membersCount: number;
}

export const ConvertToPrivateSection = memo(({ onConvertToPrivate, membersCount }: ConvertToPrivateSectionProps) => {
  const { t } = useSettings();
  const hasMembers = membersCount > 0;
  const [open, setOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5, mb: 1, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={settingsRowSx} onClick={() => setOpen(v => !v)}>
        <Box component="span" sx={{ fontSize: 22 }}>🔒</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToPrivate')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToPrivateHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.disabled', flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={expandedAreaSx}>
          {hasMembers ? (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                {t('convertToPrivateMembersTitle')} ({membersCount})
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55 }}>
                {t('convertToPrivateMembersHint')}
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.55 }}>
                {t('convertToPrivateWarning')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setOpen(false)}
                  disabled={converting}
                  sx={{ flex: 1, fontSize: 13, borderRadius: '12px', height: 40 }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={converting}
                  onClick={async () => {
                    setConverting(true);
                    try {
                      await onConvertToPrivate();
                    } finally {
                      setConverting(false);
                    }
                  }}
                  sx={{ flex: 1, fontSize: 13, fontWeight: 700, borderRadius: '12px', height: 40 }}
                >
                  {converting ? <CircularProgress size={17} sx={{ color: 'white' }} /> : t('confirm')}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
