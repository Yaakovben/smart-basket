import { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { CloudinaryMetricMeta } from '../helpers/dbHealthHelpers';

interface CloudinaryMetricRowProps {
  meta: CloudinaryMetricMeta;
  valueText: string;
  pct: number | null;
  isDark: boolean;
}

// שורת מדד Cloudinary בודד - אותו עיצוב בדיוק כמו DbHealthCollectionRow
// (אייקון עגול, שם אמיתי + שם ידידותי, פס התקדמות), אבל עם ההסבר מוסתר
// כברירת מחדל ונפתח בלחיצה (accordion) - כאן רק 5 שורות ולא רוצים גוש
// טקסט קבוע לצד כל אחת.
export const CloudinaryMetricRow = ({ meta, valueText, pct, isDark }: CloudinaryMetricRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = meta.icon;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded(v => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v); } }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        mb: 1, p: 1.5, borderRadius: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
        border: '1px solid', borderColor: 'divider',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        '&:last-child': { mb: 0 },
      }}
    >
      <Box sx={{
        width: 40, height: 40, borderRadius: '50%',
        bgcolor: meta.color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ color: meta.color, fontSize: 22 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
          {/* השם האמיתי (כמו ש-Cloudinary עצמו קורא למדד, לא תרגום) + השם הידידותי */}
          <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
              {meta.en}
            </Typography>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
              {meta.he}
            </Typography>
            <ExpandMoreRoundedIcon sx={{
              fontSize: 15, color: 'text.disabled', flexShrink: 0,
              transition: 'transform 0.15s ease',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }} />
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: meta.color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {valueText}
            {pct != null && <Box component="span" sx={{ fontSize: 10.5, color: 'text.disabled', ml: 0.5 }}>({pct}%)</Box>}
          </Typography>
        </Box>
        {pct != null && (
          <Box sx={{
            height: 4, borderRadius: 2, mt: 0.5, overflow: 'hidden',
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}>
            <Box sx={{ width: `${Math.min(100, pct)}%`, height: '100%', bgcolor: meta.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </Box>
        )}
        <Collapse in={expanded}>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.35, mt: 0.6 }}>
            {meta.desc}
          </Typography>
        </Collapse>
      </Box>
    </Box>
  );
};
