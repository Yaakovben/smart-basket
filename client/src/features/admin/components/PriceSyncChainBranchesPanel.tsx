import { Box, Typography, Button } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { ShimmerBlock } from '../../../global/components';
import { PriceSyncBranchAddForm } from './PriceSyncBranchAddForm';
import { PriceSyncBranchRow } from './PriceSyncBranchRow';
import type { ChainBranch, NewBranchForm } from '../types/priceSync-types';

interface PriceSyncChainBranchesPanelProps {
  isLoadingThis: boolean;
  branchList: ChainBranch[] | undefined;
  addingBranch: boolean;
  newBranch: NewBranchForm;
  setNewBranch: React.Dispatch<React.SetStateAction<NewBranchForm>>;
  isDark: boolean;
  onToggleAdd: () => void;
  onSaveBranch: () => void;
  onCancelAdd: () => void;
  onDeleteBranch: (branchId: string) => void;
}

// תוכן הפאנל המורחב של רשת - רשימת הסניפים שלה + טופס הוספה ידנית
export const PriceSyncChainBranchesPanel = ({
  isLoadingThis, branchList, addingBranch, newBranch, setNewBranch, isDark,
  onToggleAdd, onSaveBranch, onCancelAdd, onDeleteBranch,
}: PriceSyncChainBranchesPanelProps) => (
  <Box sx={{
    px: 1.5, py: 1,
    bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
  }}>
    {isLoadingThis ? (
      // אותו מבנה כמו הרשימה: שורת כותרת עם כפתור, ושורות סניף (אריח, שם
      // ותגית, כתובת ומזהה, ושני כפתורי פעולה)
      <Box aria-busy>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
          <ShimmerBlock width="40%" height={10} radius={5} />
          <Box sx={{ flex: 1 }} />
          <ShimmerBlock width={72} height={24} radius={8} />
        </Box>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, p: 1 }}>
            <ShimmerBlock width={26} height={26} radius={8} />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <ShimmerBlock width="50%" height={12} radius={6} />
              <ShimmerBlock width="70%" height={10} radius={5} />
              <ShimmerBlock width="28%" height={9} radius={4} />
            </Box>
            <ShimmerBlock circle height={26} />
            <ShimmerBlock circle height={26} />
          </Box>
        ))}
      </Box>
    ) : (
      // הצגנו תמיד את הכותרת + כפתור "הוסף סניף" - גם כשהמאגר ריק.
      // אחרת אדמין שרוצה להוסיף לרשת בלי סניפים תקוע. הודעת הריקנות
      // מוצגת בענף הפנימי (~30 שורות מתחת).
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', flex: 1, letterSpacing: 0.3 }}>
            {branchList && branchList.length > 0
              ? `${branchList.length} סניפים · ${branchList.filter(b => b.hasCoords).length} עם מיקום`
              : 'אין סניפים — לחץ "הוסף סניף" כדי להתחיל'}
          </Typography>
          <Button
            size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: 14 }} />}
            onClick={onToggleAdd}
            sx={{
              fontSize: 10.5, fontWeight: 800, color: '#14B8A6', textTransform: 'none',
              minHeight: 0, py: 0.3, px: 1, borderRadius: '6px',
              '& .MuiButton-startIcon': { marginInlineEnd: 0.4 },
            }}
          >
            הוסף סניף
          </Button>
        </Box>

        {/* טופס הוספת סניף ידני */}
        {addingBranch && (
          <PriceSyncBranchAddForm newBranch={newBranch} setNewBranch={setNewBranch} isDark={isDark} onSave={onSaveBranch} onCancel={onCancelAdd} />
        )}

        {!branchList || branchList.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', py: 1 }}>
            אין סניפים במאגר עדיין
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, maxHeight: 240, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            {branchList.map(b => (
              <PriceSyncBranchRow key={b.id} branch={b} isDark={isDark} onDelete={() => onDeleteBranch(b.id)} />
            ))}
          </Box>
        )}
      </>
    )}
  </Box>
);
