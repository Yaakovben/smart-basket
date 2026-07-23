import { Box, Typography } from '@mui/material';
import type { PriceChainStatus } from '../../priceComparison';
import { PriceSyncChainListItem } from './PriceSyncChainListItem';
import type { ChainBranch, NewBranchForm } from '../types/priceSync-types';

interface PriceSyncChainListProps {
  chains: PriceChainStatus[];
  filteredChains: PriceChainStatus[];
  isDark: boolean;
  expandedChain: string | null;
  loadingChain: string | null;
  chainBranches: Map<string, ChainBranch[]>;
  addingBranch: string | null;
  newBranch: NewBranchForm;
  setNewBranch: React.Dispatch<React.SetStateAction<NewBranchForm>>;
  onToggleChain: (chainId: string) => void;
  onToggleAddBranch: (chainId: string) => void;
  onSaveBranch: (chainId: string) => void;
  onCancelAddBranch: () => void;
  onDeleteBranch: (chainId: string, branchId: string) => void;
  onShowAllFilter: () => void;
}

// רשימת הרשתות (מסוננת) - כל שורה פותחת פאנל עם הסניפים שלה
export const PriceSyncChainList = ({
  chains, filteredChains, isDark, expandedChain, loadingChain, chainBranches,
  addingBranch, newBranch, setNewBranch,
  onToggleChain, onToggleAddBranch, onSaveBranch, onCancelAddBranch, onDeleteBranch, onShowAllFilter,
}: PriceSyncChainListProps) => (
  <>
    {/* הודעה כשפילטר לא מחזיר תוצאות - מונע "מסך ריק" אילם */}
    {chains.length > 0 && filteredChains.length === 0 && (
      <Box sx={{
        p: 1.5, borderRadius: '12px',
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: '1px dashed', borderColor: 'divider',
        textAlign: 'center',
      }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          לא נמצאו רשתות תואמות לפילטר.{' '}
          <Box
            component="span"
            role="button"
            onClick={onShowAllFilter}
            sx={{ color: '#0D9488', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
          >
            הצג הכל
          </Box>
        </Typography>
      </Box>
    )}

    {/* ===== רשימת רשתות ===== */}
    {filteredChains.length > 0 && (
      <Box sx={{
        borderRadius: '12px',
        border: '1px solid', borderColor: 'divider',
        overflow: 'hidden',
      }}>
        <Box sx={{
          px: 2, py: 1,
          bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4 }}>
            {filteredChains.length} {filteredChains.length === chains.length ? 'רשתות' : `מתוך ${chains.length} רשתות`} · לחיצה תציג סניפים
          </Typography>
        </Box>
        {filteredChains.map((c) => (
          <PriceSyncChainListItem
            key={c.chainId}
            chain={c}
            isExpanded={expandedChain === c.chainId}
            isLoadingThis={loadingChain === c.chainId}
            branchList={chainBranches.get(c.chainId)}
            addingBranch={addingBranch === c.chainId}
            newBranch={newBranch}
            setNewBranch={setNewBranch}
            isDark={isDark}
            onToggleChain={() => onToggleChain(c.chainId)}
            onToggleAddBranch={() => onToggleAddBranch(c.chainId)}
            onSaveBranch={() => onSaveBranch(c.chainId)}
            onCancelAddBranch={onCancelAddBranch}
            onDeleteBranch={(branchId) => onDeleteBranch(c.chainId, branchId)}
          />
        ))}
      </Box>
    )}
  </>
);
