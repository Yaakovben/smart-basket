import { useState, useEffect, memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { STORAGE_KEYS } from '../constants';

export const ConsentBanner = memo(() => {
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useSettings();

  // Re-check consent when location changes (e.g., after accepting on privacy page)
  useEffect(() => {
    const hasConsent = localStorage.getItem(STORAGE_KEYS.CONSENT_ACCEPTED);
    setShowBanner(!hasConsent);
  }, [location.pathname]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEYS.CONSENT_ACCEPTED, 'true');
    setShowBanner(false);
  };

  // Hide banner on privacy and terms pages
  const isLegalPage = location.pathname === '/privacy' || location.pathname === '/terms';

  if (!showBanner || isLegalPage) return null;

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
