import { Box, Typography } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { Modal } from '../../../global/components';
import { modalContentSx, aboutIconCircleSx, aboutFooterBoxSx } from '../styles/SettingsComponent.styles';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal = ({ onClose }: AboutModalProps) => {
  const { t } = useSettings();

  return (
    <Modal title={t('about')} onClose={onClose}>
      <Box sx={modalContentSx}>
        <Box sx={aboutIconCircleSx}>🛒</Box>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{t('appName')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>{t('version')} 1.1.0</Typography>
        <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3, px: 2 }}>{t('aboutDescription')}</Typography>
        <Box sx={aboutFooterBoxSx}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>© {new Date().getFullYear()} {t('appName')}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{t('allRightsReserved')}</Typography>
        </Box>
      </Box>
    </Modal>
  );
};
