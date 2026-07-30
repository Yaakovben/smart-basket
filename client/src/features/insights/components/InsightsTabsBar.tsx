import { Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import type { InsightTab } from '../types/insights-types';

interface InsightsTabsBarProps {
  isDark: boolean;
  tab: InsightTab;
  onTabChange: (tab: InsightTab) => void;
}

// הגדרת מיפוי tabs - ריכוז מידע על כל טאב
const TABS: { value: InsightTab; emoji: string; label: string }[] = [
  { value: 'price',    emoji: '💰', label: 'מחירים'  },
  { value: 'spending', emoji: '🧾', label: 'הוצאות'  },
  { value: 'lists',    emoji: '📋', label: 'רשימות'  },
  { value: 'activity', emoji: '📊', label: 'פעילות'  },
];

// טאבים ראשיים - עיצוב בולט ומוגבה כניווט ראשי.
// גובה 52px + אמוג'י 20px + פונט מוגדל + צל עמוק = היררכיה ברורה מעל
// ChainSortBar שנשאר קטן וקל כמסנן משני.
export const InsightsTabsBar = ({ isDark, tab, onTabChange }: InsightsTabsBarProps) => {
  return (
    <Box sx={{ px: 2, mb: 2 }}>
      <Paper elevation={0} sx={{
        borderRadius: '18px', p: '5px',
        border: '2px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.22)',
        backgroundImage: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.13) 0%, rgba(255,255,255,0.03) 100%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.09) 0%, rgba(255,255,255,0.9) 100%)',
        backdropFilter: 'blur(12px)',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 18px rgba(0,0,0,0.28)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 18px rgba(20,184,166,0.14), 0 8px 28px rgba(15,118,110,0.09)',
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          variant="fullWidth"
          sx={{
            minHeight: 52,
            '& .MuiTabs-flexContainer': { gap: 0.4 },
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              borderRadius: '13px',
              minWidth: 0,
              px: 0.5,
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover:not(.Mui-selected)': {
                color: 'text.primary',
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
              '&:active:not(.Mui-selected)': { transform: 'scale(0.95)' },
              '&.Mui-selected': {
                color: 'white',
                backgroundImage: 'linear-gradient(145deg, #1CC5B3 0%, #0D9488 60%, #0B7A71 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 5px 20px rgba(20,184,166,0.55)',
                transform: 'translateY(-1px)',
                fontWeight: 800,
                fontSize: 13.5,
              },
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          {TABS.map(({ value, emoji, label }) => (
            <Tab
              key={value}
              value={value}
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Box sx={{ fontSize: 20, lineHeight: 1 }}>{emoji}</Box>
                  <Box sx={{ fontSize: 11, fontWeight: 'inherit', lineHeight: 1 }}>{label}</Box>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>
    </Box>
  );
};
