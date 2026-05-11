/**
 * InsightsLoader - wrapper שמפנה ל-PulseLoader האחיד.
 * נשמר כדי לא לשבור call sites קיימים, אבל הוויזואל אחיד עם שאר האפליקציה.
 */
import { memo } from 'react';
import { Box } from '@mui/material';
import { PulseLoader } from '../../../global/components';

interface Props {
  text?: string;
  size?: 'sm' | 'md';
  accent?: string;
}

export const InsightsLoader = memo(({ text, size = 'md', accent }: Props) => (
  <Box sx={{ py: size === 'sm' ? 3 : 5 }} role="status" aria-live="polite" aria-label={text || 'טוען'}>
    <PulseLoader size={size === 'sm' ? 'sm' : 'md'} label={text} color={accent} />
  </Box>
));

InsightsLoader.displayName = 'InsightsLoader';
