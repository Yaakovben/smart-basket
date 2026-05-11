/**
 * InsightsLoader - wrapper שמפנה ל-Shimmer האחיד.
 * נשמר לתאימות עם call sites קיימים, אבל הוויזואל אחיד בכל האפליקציה.
 */
import { memo } from 'react';
import { Box } from '@mui/material';
import { ShimmerList } from '../../../global/components';

interface Props {
  text?: string;
  size?: 'sm' | 'md';
  accent?: string;
}

export const InsightsLoader = memo(({ text, size = 'md' }: Props) => (
  <Box sx={{ py: size === 'sm' ? 1.5 : 2.5 }} role="status" aria-live="polite" aria-label={text || 'טוען'}>
    <ShimmerList count={size === 'sm' ? 3 : 5} rowHeight={size === 'sm' ? 44 : 64} gap={8} />
  </Box>
));

InsightsLoader.displayName = 'InsightsLoader';
