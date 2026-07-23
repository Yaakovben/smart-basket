import { memo, useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== המרת רשימה פרטית לקבוצה: כרטיס פתיחה + שלב הגדרת סיסמה =====
interface ConvertToGroupSectionProps {
  onConvertToGroup: (password: string) => void | Promise<void>;
}

export const ConvertToGroupSection = memo(({ onConvertToGroup }: ConvertToGroupSectionProps) => {
  const { t } = useSettings();
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  const [convertPassword, setConvertPassword] = useState('');
  const [converting, setConverting] = useState(false);

  if (!showPasswordStep) {
    return (
      <Box
        onClick={() => setShowPasswordStep(true)}
        sx={{
          mt: 2.5,
          p: 1.5,
          borderRadius: '12px',
          bgcolor: 'rgba(20, 184, 166, 0.06)',
          border: '1.5px dashed',
          borderColor: 'rgba(20, 184, 166, 0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          transition: 'all 0.15s ease',
          '&:active': { transform: 'scale(0.98)', bgcolor: 'rgba(20, 184, 166, 0.12)' }
        }}
      >
        <Box sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: 'rgba(20, 184, 166, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0
        }}>
          👥
        </Box>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main', lineHeight: 1.3 }}>
            {t('convertToGroup')}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
            {t('convertToGroupHint')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: 'rgba(20, 184, 166, 0.06)', border: '1.5px solid', borderColor: 'primary.main' }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main', mb: 1.5 }}>
        {t('setGroupPassword')}
      </Typography>
      <TextField
        fullWidth
        value={convertPassword}
        onChange={e => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setConvertPassword(val);
        }}
        placeholder="1234"
        size="small"
        inputProps={{ inputMode: 'numeric', maxLength: 4, style: { textAlign: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 8 } }}
        sx={{ mb: 1.5 }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => { setShowPasswordStep(false); setConvertPassword(''); }}
          disabled={converting}
          sx={{ flex: 1, fontSize: 13 }}
        >
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={convertPassword.length !== 4 || converting}
          onClick={async () => {
            setConverting(true);
            try {
              await onConvertToGroup(convertPassword);
            } finally {
              setConverting(false);
            }
          }}
          sx={{ flex: 1, fontSize: 13 }}
        >
          {converting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : t('convertToGroup')}
        </Button>
      </Box>
    </Box>
  );
});

ConvertToGroupSection.displayName = 'ConvertToGroupSection';
