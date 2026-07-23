import { Box, Typography } from '@mui/material';
import type { translations } from '../i18n/translations';
import {
  reloadingScreenSx, reloadingHaloSx, reloadingRocketSx, reloadingTitleSx, reloadingSubtitleSx,
  reloadingProgressTrackSx, reloadingProgressBarSx,
} from '../styles/ErrorBoundary.styles';

interface ErrorBoundaryReloadingScreenProps {
  t: (typeof translations)[keyof typeof translations];
}

/**
 * בזמן ריענון אוטומטי - מסך 'מעדכן גרסה' מעוצב במיוחד.
 * השראה: רקטה (שדרוג) + halo פועם + פס פרוגרס + נקודות מהבהבות.
 * נותן תחושה של "משהו טוב קורה" במקום loader גנרי.
 */
export const ErrorBoundaryReloadingScreen = ({ t }: ErrorBoundaryReloadingScreenProps) => (
  <Box sx={reloadingScreenSx}>
    {/* Halo עגול מאחורי הרקטה - עומק רך, בלי הבזקים */}
    <Box sx={reloadingHaloSx} />

    {/* רקטה במרכז */}
    <Box sx={reloadingRocketSx}>
      🚀
    </Box>

    {/* כותרת */}
    <Typography sx={reloadingTitleSx}>
      {t.updatingVersion}
    </Typography>
    {/* כותרת משנה */}
    <Typography sx={reloadingSubtitleSx}>
      גרסה חדשה זמינה — טוען עדכון
    </Typography>

    {/* פס פרוגרס דק בתחתית המסך */}
    <Box sx={reloadingProgressTrackSx}>
      <Box sx={reloadingProgressBarSx} />
    </Box>
  </Box>
);
