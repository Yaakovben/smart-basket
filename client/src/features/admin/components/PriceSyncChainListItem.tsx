import { Box, Typography, Collapse } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { PriceChainStatus } from '../../priceComparison';
import { humanizeError } from '../helpers/priceSyncHelpers';
import { PriceSyncChainBranchesPanel } from './PriceSyncChainBranchesPanel';
import type { ChainBranch, NewBranchForm } from '../types/priceSync-types';

interface PriceSyncChainListItemProps {
  chain: PriceChainStatus;
  isExpanded: boolean;
  isLoadingThis: boolean;
  branchList: ChainBranch[] | undefined;
  addingBranch: boolean;
  newBranch: NewBranchForm;
  setNewBranch: React.Dispatch<React.SetStateAction<NewBranchForm>>;
  isDark: boolean;
  onToggleChain: () => void;
  onToggleAddBranch: () => void;
  onSaveBranch: () => void;
  onCancelAddBranch: () => void;
  onDeleteBranch: (branchId: string) => void;
}

// שורת רשת בודדת ברשימת ניהול המאגר - לחיצה פותחת פאנל עם רשימת הסניפים
export const PriceSyncChainListItem = ({
  chain: c, isExpanded, isLoadingThis, branchList, addingBranch, newBranch, setNewBranch, isDark,
  onToggleChain, onToggleAddBranch, onSaveBranch, onCancelAddBranch, onDeleteBranch,
}: PriceSyncChainListItemProps) => {
  const humanError = c.lastSyncError ? humanizeError(c.lastSyncError) : null;
  const isHardError = humanError?.severity === 'hard';
  const isSoftError = humanError?.severity === 'soft';
  const isEmpty = c.count === 0;
  const statusColor = isHardError ? '#EF4444' : isSoftError ? '#94A3B8' : isEmpty ? '#F59E0B' : '#10B981';

  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
      {/* שורת רשת - לחיצה פותחת */}
      <Box
        onClick={onToggleChain}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.1,
          cursor: 'pointer', userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          bgcolor: isExpanded ? (isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)') : 'transparent',
          '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)' },
          transition: 'background-color 0.12s',
        }}
      >
        {/* אייקון סטטוס */}
        {isHardError ? <ErrorOutlineIcon sx={{ fontSize: 16, color: statusColor }} />
          : isSoftError ? <PauseCircleOutlineIcon sx={{ fontSize: 16, color: statusColor }} />
          : <CheckCircleIcon sx={{ fontSize: 15, color: statusColor }} />}

        {/* שם + נתונים */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {c.chainName}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 0.3, alignItems: 'center' }}>
            <Typography sx={{ fontSize: 10.5, color: c.count > 0 ? '#0F766E' : 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              💰 {c.count > 0 ? `${c.count.toLocaleString('he-IL')} מחירים` : 'אין מחירים'}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: c.branchCount && c.branchCount > 0 ? '#14B8A6' : 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              📍 {c.branchCount && c.branchCount > 0 ? `${c.branchCount} סניפים` : 'אין סניפים'}
            </Typography>
            {c.lastSyncAt && (() => {
              const ageH = (Date.now() - new Date(c.lastSyncAt).getTime()) / 3_600_000;
              const stale = ageH > 24;
              const label = ageH < 1 ? 'פחות משעה' : ageH < 24 ? `${Math.round(ageH)}ש` : `${Math.round(ageH / 24)}י`;
              return (
                <Typography sx={{ fontSize: 10.5, color: stale ? '#D97706' : 'text.secondary', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  🕒 לפני {label}
                </Typography>
              );
            })()}
          </Box>
          {humanError && (
            <Typography sx={{ fontSize: 10, color: isHardError ? '#B91C1C' : 'text.secondary', mt: 0.3 }}>
              {humanError.msg}
            </Typography>
          )}
        </Box>

        <ExpandMoreIcon sx={{
          fontSize: 18, color: 'text.disabled',
          transition: 'transform 0.2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
        }} />
      </Box>

      {/* פאנל הרחבה - רשימת סניפים */}
      <Collapse in={isExpanded} timeout={200} unmountOnExit>
        <PriceSyncChainBranchesPanel
          isLoadingThis={isLoadingThis}
          branchList={branchList}
          addingBranch={addingBranch}
          newBranch={newBranch}
          setNewBranch={setNewBranch}
          isDark={isDark}
          onToggleAdd={onToggleAddBranch}
          onSaveBranch={onSaveBranch}
          onCancelAdd={onCancelAddBranch}
          onDeleteBranch={onDeleteBranch}
        />
      </Collapse>
    </Box>
  );
};
