import { memo, useEffect, useRef, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Collapse, Paper } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { List } from '../../../../global/types';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, expandedAreaSx, pinFieldSx, actionBtnSx } from './listSettingsCardSx';

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

  // גולל את השדה לתצוגה אחרי שאנימציית הפתיחה מסתיימת
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 260);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5, mb: 2, border: '1px solid', borderColor: 'divider' }}>
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
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25 }}>
            {t('newPasswordLabel')}
          </Typography>
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
