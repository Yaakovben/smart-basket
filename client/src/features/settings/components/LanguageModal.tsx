import { Box, Typography, Button } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { LANGUAGES } from '../../../global/constants';
import type { Language } from '../../../global/types';
import { Modal } from '../../../global/components';
import { languageButtonSx, languageTextAlignSx } from '../styles/SettingsComponent.styles';

interface LanguageModalProps {
  onClose: () => void;
  onSelect: (lang: Language) => void;
}

export const LanguageModal = ({ onClose, onSelect }: LanguageModalProps) => {
  const { settings, t } = useSettings();

  return (
    <Modal title={t('language')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {LANGUAGES.map((lang) => {
          const isSelected = settings.language === lang.code;
          return (
            <Button key={lang.code} onClick={() => onSelect(lang.code as Language)} fullWidth sx={languageButtonSx(isSelected)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography sx={{ fontSize: 24 }}>{lang.code === 'he' ? '🇮🇱' : lang.code === 'en' ? '🇺🇸' : '🇷🇺'}</Typography>
                <Box sx={languageTextAlignSx(settings.language === 'he')}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>{lang.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{lang.nameEn}</Typography>
                </Box>
                {isSelected && <Typography sx={{ fontSize: 20, color: 'primary.main' }}>✓</Typography>}
              </Box>
            </Button>
          );
        })}
      </Box>
    </Modal>
  );
};
