import { Box, Paper, Tabs, Tab } from '@mui/material';
import type { InsightTab } from '../types/insights-types';

interface InsightsTabsBarProps {
  isDark: boolean;
  tab: InsightTab;
  onTabChange: (tab: InsightTab) => void;
}

// טאבים - עיצוב פרימיום עם glassmorphism וטאב פעיל זוהר.
export const InsightsTabsBar = ({ isDark, tab, onTabChange }: InsightsTabsBarProps) => {
  return (
    <Box sx={{ px: 2, mb: 2 }}>
      <Paper elevation={0} sx={{
        borderRadius: '999px', p: 0.45,
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.14)',
        backgroundImage: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.08) 0%, rgba(255,255,255,0.02) 100%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(255,255,255,0.7) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.15)'
          : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(20,184,166,0.08), 0 6px 18px rgba(15,118,110,0.06)',
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          variant="fullWidth"
          sx={{
            minHeight: 38,
            '& .MuiTabs-flexContainer': { gap: 0.25 },
            '& .MuiTab-root': {
              minHeight: 34, fontSize: 12.5, fontWeight: 700, textTransform: 'none',
              color: 'text.secondary', borderRadius: '999px', minWidth: 0, px: 0.5,
              transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover:not(.Mui-selected)': {
                color: 'text.primary',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
              '&:active:not(.Mui-selected)': { transform: 'scale(0.96)' },
              '&.Mui-selected': {
                color: 'white',
                backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px rgba(20,184,166,0.45)',
                transform: 'translateY(-0.5px)',
                fontWeight: 800,
              },
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab value="price" label="💰 מחירים" />
          <Tab value="lists" label="📋 רשימות" />
          <Tab value="habits" label="🏆 הרגלים" />
          <Tab value="pulse" label="📈 דופק" />
          <Tab value="spending" label="🧾 הוצאות" />
        </Tabs>
      </Paper>
    </Box>
  );
};
