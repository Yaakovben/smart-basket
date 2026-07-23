import { Box, Typography } from '@mui/material';
import type { PriceChainTotal } from '../types/priceComparison.types';
import { ProductRow } from './ProductRow';
import { ChainBranchInfo } from './ChainBranchInfo';

interface ChainCardDetailsProps {
  chain: PriceChainTotal;
  isDark: boolean;
  hasMatches: boolean;
  onNavigate: (e: React.MouseEvent) => void;
}

// תוכן מורחב - רשימת מוצרים + סניף קרוב. מוצג בתוך ה-Collapse של כרטיס רשת.
export const ChainCardDetails = ({ chain, isDark, hasMatches, onNavigate }: ChainCardDetailsProps) => (
  <Box sx={{
    px: 1.5, pb: 1.5,
    borderTop: '1px dashed',
    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  }}>
    {/* סניף קרוב + ניווט - רקע ניטרלי במקום סגול */}
    {chain.nearestBranch && (
      <ChainBranchInfo branch={chain.nearestBranch} isDark={isDark} onNavigate={onNavigate} />
    )}

    {/* רשימת מוצרים */}
    {hasMatches ? (
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {chain.matches.map((m) => (
          <ProductRow key={`${m.productId}-${m.chainId}`} match={m} isDark={isDark} />
        ))}
        {/* הסבר עדין על שיטת ההתאמה - מודגש למשתמש שזה לא תמיד 1:1 */}
        <Typography sx={{
          fontSize: 9.5, color: 'text.disabled', textAlign: 'center',
          mt: 1, lineHeight: 1.45, fontStyle: 'italic', px: 1,
        }}>
          ℹ️ ההתאמה למוצרים ברשת מבוססת על מילים בשם המוצר. הצגנו את ההתאמה הקרובה ביותר; בדקו את שם המוצר המלא בסניף.
        </Typography>
      </Box>
    ) : (
      <Box sx={{
        mt: 1.25, p: 1.25, borderRadius: '8px',
        bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
        textAlign: 'center',
      }}>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          {chain.hasData
            ? 'לא הצלחנו לזהות מוצרים מהרשימה ברשת זו'
            : 'הרשת לא פרסמה מחירים היום - ננסה שוב בקרוב'}
        </Typography>
      </Box>
    )}
  </Box>
);
