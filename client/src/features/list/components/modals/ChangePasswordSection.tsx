import { memo, useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, accentBarSx, expandedAreaSx, pinFieldSx, actionBtnSx } from './listSettingsCardSx';

interface ChangePasswordSectionProps {
  list: List;
  onChangePassword: (password: string) => void | Promise<void>;
}

export const ChangePasswordSection = memo(({ list, onChangePassword }: ChangePasswordSectionProps) => {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  // גולל את אזור ה-Collapse לתצוגה אחרי שאנימציית הפתיחה מסתיימת (250ms)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 260);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Paper sx={{ ...accentBarSx('accent'), borderRadius: '16px', overflow: 'hidden', mt: 2.5, mb: 2 }}>
      <Box sx={settingsRowSx} onClick={() => setOpen(v => !v)}>
        <Box component="span" sx={{ fontSize: 22 }}>🔑</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('changePassword')}</Typography>
          <Typography sx={rowHintSx}>{t('changePasswordHint')}</Typography>
        </Box>
        <ExpandMoreRoundedIcon sx={{
          color: 'text.disabled', flexShrink: 0,
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box ref={expandedRef} sx={expandedAreaSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <LockResetRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500 }}>
              {t('newPasswordLabel')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              value={newPassword}
              onChange={e => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8 } }}
              sx={pinFieldSx}
            />
            <Button
              variant="contained"
              disabled={newPassword.length !== 4 || newPassword === (list.password || '') || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onChangePassword(newPassword);
                  setNewPassword('');
                  setOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
              sx={actionBtnSx}
            >
              {saving ? <CircularProgress size={17} sx={{ color: 'white' }} /> : t('save')}
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

ChangePasswordSection.displayName = 'ChangePasswordSection';
