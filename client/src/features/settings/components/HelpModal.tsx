import { Box, Typography, Button } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { Modal } from '../../../global/components';
import { modalContentSx, helpIconCircleSx, emailButtonSx, emailIconCircleSx, languageTextAlignSx } from '../styles/SettingsComponent.styles';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal = ({ onClose }: HelpModalProps) => {
  const { settings, t } = useSettings();

  return (
    <Modal title={t('helpSupport')} onClose={onClose}>
      <Box sx={modalContentSx}>
        <Box sx={helpIconCircleSx}>
          📧
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('contactUs')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3, px: 2 }}>{t('helpDescription')}</Typography>
        <Button component="a" href="mailto:smartbasket129@gmail.com?subject=Smart Basket - Support" target="_blank" rel="noopener noreferrer" fullWidth sx={emailButtonSx}>
          <Box sx={emailIconCircleSx}>
            📧
          </Box>
          <Box sx={languageTextAlignSx(settings.language === 'he')}>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{t('sendEmail')}</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.8 }}>smartbasket129@gmail.com</Typography>
          </Box>
        </Button>
      </Box>
    </Modal>
  );
};
