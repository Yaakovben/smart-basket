/**
 * InsightsLoader - wrapper שמפנה ל-Shimmer האחיד.
 * נשמר לתאימות עם call sites קיימים, אבל הוויזואל אחיד בכל האפליקציה.
 */
import { memo } from 'react';
import { Box } from '@mui/material';
import { ShimmerList } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';

interface Props {
  text?: string;
  size?: 'sm' | 'md';
  accent?: string;
}

export const InsightsLoader = memo(({ text, size = 'md' }: Props) => {
  const { t } = useSettings();
  return (
    <Box sx={{ py: size === 'sm' ? 1.5 : 2.5 }} role="status" aria-live="polite" aria-label={text || t('loadingLabel')}>
      <ShimmerList count={size === 'sm' ? 3 : 5} rowHeight={size === 'sm' ? 44 : 64} gap={8} />
    </Box>
  );
});

InsightsLoader.displayName = 'InsightsLoader';
