import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, InputAdornment, Grow } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';

interface QuickAddBarProps {
  onQuickAdd: (name: string) => void;
}

export const QuickAddBar = memo(({ onQuickAdd }: QuickAddBarProps) => {
  const { t } = useSettings();
  const [value, setValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    haptic('light');
    onQuickAdd(trimmed);
    setValue('');
    setShowSuccess(true);

    // Keep focus on input for rapid additions
    inputRef.current?.focus();
  }, [value, onQuickAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Reset success animation
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        mb: 2,
        position: 'relative'
      }}
    >
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder={t('quickAddPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            boxShadow: showSuccess
              ? '0 0 0 2px rgba(20, 184, 166, 0.4)'
              : '0 2px 8px rgba(0,0,0,0.08)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 16px rgba(20, 184, 166, 0.2)'
            }
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box sx={{ fontSize: 18 }}>🛒</Box>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Grow in={value.trim().length >= 2}>
                <IconButton
                  onClick={handleSubmit}
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                  aria-label={t('add')}
                >
                  <AddIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Grow>
            </InputAdornment>
          ),
          'aria-label': t('quickAddPlaceholder')
        }}
      />
    </Box>
  );
});

QuickAddBar.displayName = 'QuickAddBar';
