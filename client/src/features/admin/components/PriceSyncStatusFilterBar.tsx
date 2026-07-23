import { Box, Typography } from '@mui/material';
import { haptic } from '../../../global/helpers';
import type { PriceChainStatus } from '../../priceComparison';
import type { ChainStatusFilterValue } from '../types/priceSync-types';

interface FilterChipProps {
  value: ChainStatusFilterValue;
  label: string;
  count?: number;
  color?: string;
  statusFilter: ChainStatusFilterValue;
  isDark: boolean;
  onSelect: (value: ChainStatusFilterValue) => void;
}

const FilterChip = ({ value, label, count, color, statusFilter, isDark, onSelect }: FilterChipProps) => {
  const active = statusFilter === value;
  const bg = active ? (color ? `${color}22` : 'rgba(20,184,166,0.18)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)');
  const border = active ? (color || '#14B8A6') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
  const txt = active ? (color || '#0F766E') : 'text.primary';
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => { haptic('light'); onSelect(value); }}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.4,
        px: 1, py: 0.4, borderRadius: '999px',
        cursor: 'pointer', userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        bgcolor: bg, border: '1px solid', borderColor: border,
        transition: 'all 0.12s',
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: active ? 800 : 700, color: txt }}>
        {label}
      </Typography>
      {count !== undefined && count > 0 && (
        <Typography sx={{
          fontSize: 10, fontWeight: 800,
          color: active ? (color || '#0F766E') : 'text.disabled',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </Typography>
      )}
    </Box>
  );
};

interface PriceSyncStatusFilterBarProps {
  chains: PriceChainStatus[];
  statusFilter: ChainStatusFilterValue;
  setStatusFilter: (v: ChainStatusFilterValue) => void;
  errorCount: number;
  noBranchCount: number;
  noPriceCount: number;
  isDark: boolean;
}

// ===== פילטר רשתות לפי סטטוס - לזיהוי מהיר של רשתות עם בעיות =====
export const PriceSyncStatusFilterBar = ({ chains, statusFilter, setStatusFilter, errorCount, noBranchCount, noPriceCount, isDark }: PriceSyncStatusFilterBarProps) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, px: 0.25 }}>
    <FilterChip value="all" label="הכל" count={chains.length} statusFilter={statusFilter} isDark={isDark} onSelect={setStatusFilter} />
    {errorCount > 0 && <FilterChip value="errors" label="עם שגיאות" count={errorCount} color="#EF4444" statusFilter={statusFilter} isDark={isDark} onSelect={setStatusFilter} />}
    {noBranchCount > 0 && <FilterChip value="no_branches" label="ללא סניפים" count={noBranchCount} color="#F59E0B" statusFilter={statusFilter} isDark={isDark} onSelect={setStatusFilter} />}
    {noPriceCount > 0 && <FilterChip value="no_prices" label="ללא מחירים" count={noPriceCount} color="#F59E0B" statusFilter={statusFilter} isDark={isDark} onSelect={setStatusFilter} />}
  </Box>
);
