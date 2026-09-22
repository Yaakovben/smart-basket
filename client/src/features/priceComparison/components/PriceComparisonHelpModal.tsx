import { Box, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';

// שורת הסבר - אייקון + כותרת קצרה + טקסט. אותו דפוס ויזואלי כמו מודאלי עזרה
// אחרים באפליקציה (למשל PriceSyncHelpModal של האדמין), רק בגובה משתמש רגיל.
const HelpRow = ({ icon, title, desc, color, isDark }: {
  icon: React.ReactNode; title: string; desc: string; color: string; isDark: boolean;
}) => (
  <Box sx={{
    display: 'flex', alignItems: 'flex-start', gap: 1,
    p: 1.1, borderRadius: '12px',
    bgcolor: isDark ? `${color}1A` : `${color}0D`,
    border: '1px solid', borderColor: `${color}33`,
  }}>
    <Box sx={{
      flexShrink: 0, mt: 0.1, width: 26, height: 26, borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: isDark ? `${color}26` : `${color}14`,
    }}>
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color, mb: 0.15 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.55 }}>{desc}</Typography>
    </Box>
  </Box>
);

// הסבר למשתמש: איך לבחור סניף ספציפי, ואיך לתקן התאמת מוצר שגויה. נפתח מלחצן
// עדין ליד כותרת "השוואת מחירים" - לא חובה לקרוא, אבל זמין למי שמתעניין.
export const PriceComparisonHelpModal = ({ onClose, isDark }: { onClose: () => void; isDark: boolean }) => {
  const { t } = useSettings();
  return (
    <Modal title={t('priceHelpTitle')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6, mb: 0.25 }}>
          {t('priceHelpIntro')}
        </Typography>

        <HelpRow
          icon={<StorefrontIcon sx={{ fontSize: 16, color: '#0D9488' }} />}
          title={t('priceHelpBranchTitle')}
          desc={t('priceHelpBranchDesc')}
          color="#0D9488"
          isDark={isDark}
        />

        <HelpRow
          icon={<SearchIcon sx={{ fontSize: 16, color: '#7C3AED' }} />}
          title={t('priceHelpMatchTitle')}
          desc={t('priceHelpMatchDesc')}
          color="#7C3AED"
          isDark={isDark}
        />

        <HelpRow
          icon={<VerifiedIcon sx={{ fontSize: 16, color: '#059669' }} />}
          title={t('priceHelpVerifiedTitle')}
          desc={t('priceHelpVerifiedDesc')}
          color="#059669"
          isDark={isDark}
        />
      </Box>
    </Modal>
  );
};
