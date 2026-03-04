import { useState } from 'react';
import { Box, Typography, Chip, TextField, MenuItem, Select, IconButton, Collapse } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ActivityFilters as ActivityFiltersType } from '../../../global/types';

interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  onFilterModeChange: (mode: ActivityFiltersType['filterMode']) => void;
  onDateChange: (date: string) => void;
  onMonthChange: (month: string) => void;
  onHourChange: (hour: number) => void;
  activityType: 'all' | 'login' | 'app_open';
  onActivityTypeChange: (type: 'all' | 'login' | 'app_open') => void;
  userNames: string[];
  selectedUser: string;
  onUserChange: (user: string) => void;
}

// צבע אחיד לכל הפילטרים
const ACCENT = '#14B8A6';
const ACCENT_BG = 'rgba(20, 184, 166, 0.10)';
const ACCENT_BORDER = 'rgba(20, 184, 166, 0.25)';

export const ActivityFilters = ({
  filters,
  onFilterModeChange,
  onDateChange,
  onMonthChange,
  onHourChange,
  activityType,
  onActivityTypeChange,
  userNames,
  selectedUser,
  onUserChange,
}: ActivityFiltersProps) => {
  const { t } = useSettings();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  // האם יש פילטרים פעילים מעבר לברירת מחדל
  const hasActiveFilters = filters.filterMode !== 'all' || activityType !== 'all' || selectedUser !== '';

  return (
    <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* שורת פילטרים ראשית: סוג פעילות + כפתור הגדרות */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {/* צ'יפים לסוג פעילות */}
        {([
          { value: 'all' as const, label: t('allTypes') },
          { value: 'login' as const, label: t('activityLogins') },
          { value: 'app_open' as const, label: t('activityAppOpens') },
        ]).map(type => (
          <Chip
            key={type.value}
            label={type.label}
            size="small"
            onClick={() => onActivityTypeChange(type.value)}
            sx={{
              height: 32,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: activityType === type.value ? ACCENT : 'transparent',
              color: activityType === type.value ? 'white' : 'text.secondary',
              border: `1px solid ${activityType === type.value ? ACCENT : 'rgba(0,0,0,0.12)'}`,
              '&:hover': { bgcolor: activityType === type.value ? ACCENT : ACCENT_BG },
              transition: 'all 0.15s ease',
            }}
          />
        ))}

        <Box sx={{ flex: 1 }} />

        {/* כפתור פילטרים מתקדמים */}
        <IconButton
          size="small"
          onClick={() => setShowAdvanced(prev => !prev)}
          sx={{
            bgcolor: hasActiveFilters ? ACCENT_BG : 'transparent',
            border: `1px solid ${hasActiveFilters ? ACCENT_BORDER : 'rgba(0,0,0,0.12)'}`,
            color: hasActiveFilters ? ACCENT : 'text.secondary',
            width: 32,
            height: 32,
          }}
        >
          {showAdvanced ? <CloseIcon sx={{ fontSize: 18 }} /> : <TuneIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* פילטרים מתקדמים: זמן + משתמש */}
      <Collapse in={showAdvanced}>
        <Box sx={{
          bgcolor: 'background.paper',
          borderRadius: '12px',
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}>
          {/* פילטר זמן */}
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('timeFilter')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {([
                { value: 'all' as const, label: t('allActivity') },
                { value: 'daily' as const, label: t('dailyView') },
                { value: 'monthly' as const, label: t('monthlyView') },
                { value: 'hourly' as const, label: t('hourlyView') },
              ]).map(mode => (
                <Chip
                  key={mode.value}
                  label={mode.label}
                  size="small"
                  onClick={() => onFilterModeChange(mode.value)}
                  sx={{
                    height: 28,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: filters.filterMode === mode.value ? ACCENT : 'transparent',
                    color: filters.filterMode === mode.value ? 'white' : 'text.secondary',
                    border: `1px solid ${filters.filterMode === mode.value ? ACCENT : 'rgba(0,0,0,0.12)'}`,
                    '&:hover': { bgcolor: filters.filterMode === mode.value ? ACCENT : ACCENT_BG },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* שדות זמן מותנים */}
          {filters.filterMode === 'daily' && (
            <TextField
              type="date"
              value={filters.selectedDate || today}
              onChange={(e) => onDateChange(e.target.value)}
              fullWidth
              size="small"
              label={t('selectDate')}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 40 } }}
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 40 } }}
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
                sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', height: 40 } }}
              />
              <Select
                value={filters.selectedHour ?? ''}
                onChange={(e) => onHourChange(Number(e.target.value))}
                displayEmpty
                size="small"
                sx={{ flex: 1, borderRadius: '10px', height: 40 }}
              >
                <MenuItem value="" disabled>{t('selectHour')}</MenuItem>
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* פילטר משתמש */}
          {userNames.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('filterByUser')}
              </Typography>
              <Select
                value={selectedUser}
                onChange={(e) => onUserChange(e.target.value)}
                displayEmpty
                fullWidth
                size="small"
                sx={{ borderRadius: '10px', height: 40 }}
              >
                <MenuItem value="">{t('allUsers')}</MenuItem>
                {userNames.map(name => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
