import { Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { TranslationKeys } from '../../../global/i18n/translations';

interface EmailLoginToggleProps {
  showEmailForm: boolean;
  onToggle: () => void;
  t: (key: TranslationKeys) => string;
}

export const EmailLoginToggle = ({ showEmailForm, onToggle, t }: EmailLoginToggleProps) => {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        cursor: 'pointer',
        py: 2,
        mt: 1,
        color: 'text.secondary',
        '&:hover': { color: 'primary.main' },
        transition: 'color 0.2s'
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
        {showEmailForm ? t('hideEmailLogin') : t('loginWithoutGoogle')}
      </Typography>
      {showEmailForm ? <KeyboardArrowUpIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
    </Box>
  );
};
