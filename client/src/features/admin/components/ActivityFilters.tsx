import { Box, Button, TextField, MenuItem, Select, FormControl, Typography, InputLabel } from '@mui/material';
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

  const filterModes: Array<{ value: ActivityFiltersType['filterMode']; label: string; icon: string }> = [
    { value: 'all', label: t('allActivity'), icon: '📊' },
    { value: 'daily', label: t('dailyView'), icon: '📅' },
    { value: 'monthly', label: t('monthlyView'), icon: '🗓️' },
    { value: 'hourly', label: t('hourlyView'), icon: '⏰' }
  ];

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '16px',
      p: 2,
      mb: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Filter Mode Buttons */}
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
        סינון לפי
      </Typography>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        mb: filters.filterMode !== 'all' ? 2 : 0
      }}>
        {filterModes.map(mode => (
          <Button
            key={mode.value}
            onClick={() => onFilterModeChange(mode.value)}
            sx={{
              borderRadius: '12px',
              bgcolor: filters.filterMode === mode.value ? 'primary.main' : 'rgba(20, 184, 166, 0.08)',
              color: filters.filterMode === mode.value ? 'white' : 'text.primary',
              textTransform: 'none',
              py: 1.25,
              px: 1,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              border: '1.5px solid',
              borderColor: filters.filterMode === mode.value ? 'primary.main' : 'rgba(20, 184, 166, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: filters.filterMode === mode.value ? 'primary.dark' : 'rgba(20, 184, 166, 0.15)',
                borderColor: 'primary.main'
              }
            }}
          >
            <Box sx={{ fontSize: 18 }}>{mode.icon}</Box>
            {mode.label}
          </Button>
        ))}
      </Box>

      {/* Conditional Inputs based on filter mode */}
      {filters.filterMode === 'daily' && (
        <Box sx={{
          bgcolor: 'rgba(20, 184, 166, 0.04)',
          borderRadius: '12px',
          p: 2,
          border: '1.5px solid',
          borderColor: 'rgba(20, 184, 166, 0.2)'
        }}>
          <TextField
            type="date"
            value={filters.selectedDate || today}
            onChange={(e) => onDateChange(e.target.value)}
            fullWidth
            label={t('selectDate')}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: '10px',
                height: 48
              }
            }}
          />
        </Box>
      )}

      {filters.filterMode === 'monthly' && (
        <Box sx={{
          bgcolor: 'rgba(20, 184, 166, 0.04)',
          borderRadius: '12px',
          p: 2,
          border: '1.5px solid',
          borderColor: 'rgba(20, 184, 166, 0.2)'
        }}>
          <TextField
            type="month"
            value={filters.selectedMonth || currentMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            fullWidth
            label={t('selectMonth')}
            InputLabelProps={{ shrink: true }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: '10px',
                height: 48
              }
            }}
          />
        </Box>
      )}

      {filters.filterMode === 'hourly' && (
        <Box sx={{
          bgcolor: 'rgba(20, 184, 166, 0.04)',
          borderRadius: '12px',
          p: 2,
          border: '1.5px solid',
          borderColor: 'rgba(20, 184, 166, 0.2)'
        }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              type="date"
              value={filters.selectedDate || today}
              onChange={(e) => onDateChange(e.target.value)}
              label={t('selectDate')}
              InputLabelProps={{ shrink: true }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                  borderRadius: '10px',
                  height: 48
                }
              }}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel shrink>{t('selectHour')}</InputLabel>
              <Select
                value={filters.selectedHour ?? ''}
                onChange={(e) => onHourChange(Number(e.target.value))}
                displayEmpty
                label={t('selectHour')}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: '10px',
                  height: 48,
                  '& .MuiSelect-select': {
                    py: 1.5
                  }
                }}
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
        </Box>
      )}
    </Box>
  );
};
