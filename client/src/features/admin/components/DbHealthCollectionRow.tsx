import { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { DbHealthCollection } from '../../../services/api/admin.api';
import { collectionMeta, formatMB } from '../helpers/dbHealthHelpers';

interface DbHealthCollectionRowProps {
  collection: DbHealthCollection;
  totalSize: number;
  isDark: boolean;
}

// שורת קולקציה בודדת. תצוגה ראשית = השם הידידותי בעברית + כמות מסמכים +
// גודל + פס (כמו שהיה). לחיצה פותחת (accordion) הסבר בעברית: השם האמיתי
// במסד, מה הקולקציה שומרת, ופירוט גודל נתונים מול אינדקסים.
export const DbHealthCollectionRow = ({ collection: c, totalSize, isDark }: DbHealthCollectionRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const meta = collectionMeta(c.name);
  const Icon = meta.icon;
  const collTotal = c.storageSize + c.indexSize;
  const collPct = totalSize > 0 ? (collTotal / totalSize) * 100 : 0;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded(v => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v); } }}
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.5,
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
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {meta.he}
            </Typography>
            <ExpandMoreRoundedIcon sx={{
              fontSize: 15, color: 'text.disabled', flexShrink: 0,
              transition: 'transform 0.15s ease',
              transform: expanded ? 'rotate(180deg)' : 'none',
            }} />
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: meta.color, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {formatMB(collTotal)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.15 }}>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {c.documents.toLocaleString('he-IL')} מסמכים
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>
            {collPct.toFixed(1)}%
          </Typography>
        </Box>
        <Box sx={{
          height: 4, borderRadius: 2, mt: 0.5, overflow: 'hidden',
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        }}>
          <Box sx={{
            width: `${Math.min(100, collPct)}%`,
            height: '100%',
            bgcolor: meta.color,
            transition: 'width 0.4s ease',
          }} />
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              שם במסד:{' '}
              <Box component="span" sx={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 700, color: 'text.primary' }}>
                {c.name}
              </Box>
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.35 }}>
              {meta.desc}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
              נתונים {formatMB(c.storageSize)} · אינדקסים {formatMB(c.indexSize)}
            </Typography>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};
