import { Box, Button, TextField, MenuItem, Select, FormControl } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ActivityFilters as ActivityFiltersType } from '../../../global/types';

interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  onFilterModeChange: (mode: ActivityFiltersType['filterMode']) => void;
  onDateChange: (date: string) => void;
  onMonthChange: (month: string) => void;
  onHourChange: (hour: number) => void;
}

export const ActivityFilters = ({
  filters,
  onFilterModeChange,
  onDateChange,
  onMonthChange,
  onHourChange
}: ActivityFiltersProps) => {
  const { t } = useSettings();

  const filterModes: Array<{ value: ActivityFiltersType['filterMode']; label: string }> = [
    { value: 'all', label: t('allActivity') },
    { value: 'daily', label: t('dailyView') },
    { value: 'monthly', label: t('monthlyView') },
    { value: 'hourly', label: t('hourlyView') }
  ];

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Filter Mode Buttons */}
      <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: 'background.default', borderRadius: '12px', mb: 2 }}>
        {filterModes.map(mode => (
          <Button
            key={mode.value}
            onClick={() => onFilterModeChange(mode.value)}
            sx={{
              flex: 1,
              borderRadius: '8px',
              bgcolor: filters.filterMode === mode.value ? 'primary.main' : 'transparent',
              color: filters.filterMode === mode.value ? 'white' : 'text.secondary',
              textTransform: 'none',
              py: 1,
              fontSize: 13,
              fontWeight: 600,
              '&:hover': {
                bgcolor: filters.filterMode === mode.value ? 'primary.dark' : 'action.hover'
              }
            }}
          >
            {mode.label}
          </Button>
        ))}
      </Box>

      {/* Conditional Inputs based on filter mode */}
      {filters.filterMode === 'daily' && (
        <TextField
          type="date"
          value={filters.selectedDate || today}
          onChange={(e) => onDateChange(e.target.value)}
          fullWidth
          size="small"
          label={t('selectDate')}
          InputLabelProps={{ shrink: true }}
          sx={{ bgcolor: 'background.paper', borderRadius: '8px' }}
        />
      )}

      {filters.filterMode === 'monthly' && (
        <TextField
          type="month"
          value={filters.selectedMonth || currentMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          fullWidth
          size="small"
          label={t('selectMonth')}
          InputLabelProps={{ shrink: true }}
          sx={{ bgcolor: 'background.paper', borderRadius: '8px' }}
        />
      )}

      {filters.filterMode === 'hourly' && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            type="date"
            value={filters.selectedDate || today}
            onChange={(e) => onDateChange(e.target.value)}
            size="small"
            label={t('selectDate')}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: '8px' }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filters.selectedHour ?? ''}
              onChange={(e) => onHourChange(Number(e.target.value))}
              displayEmpty
              sx={{ bgcolor: 'background.paper', borderRadius: '8px' }}
            >
              <MenuItem value="" disabled>{t('selectHour')}</MenuItem>
              {Array.from({ length: 24 }, (_, i) => (
                <MenuItem key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
    </Box>
  );
};
