import { useState, useEffect, memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const CONSENT_KEY = 'sb_consent_accepted';

export const ConsentBanner = memo(() => {
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();
  const { t } = useSettings();

  useEffect(() => {
    const hasConsent = localStorage.getItem(CONSENT_KEY);
    if (!hasConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        p: 2,
        zIndex: 9999,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
      }}
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
    >
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <Typography
          id="consent-title"
          sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: 'text.primary' }}
        >
          {t('consentTitle')}
        </Typography>
        <Typography
          id="consent-description"
          sx={{ fontSize: 13, color: 'text.secondary', mb: 2, lineHeight: 1.6 }}
        >
          {t('consentDescription')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleAccept}
            sx={{ flex: 1, minWidth: 120 }}
            aria-label={t('accept')}
          >
            {t('accept')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/privacy')}
            sx={{ flex: 1, minWidth: 120 }}
            aria-label={t('privacyPolicy')}
          >
            {t('privacyPolicy')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

ConsentBanner.displayName = 'ConsentBanner';
