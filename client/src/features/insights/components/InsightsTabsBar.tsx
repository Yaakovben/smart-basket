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

// טאבים ראשיים - עיצוב בולט יותר עם מעבר gradient על הנבחר.
// גובה מוגדל (44px) + פונט גדול יותר = היררכיה ברורה מול טאבים משניים
// (כמו ChainSortBar שנראה ברור "שני").
export const InsightsTabsBar = ({ isDark, tab, onTabChange }: InsightsTabsBarProps) => {
  return (
    <Box sx={{ px: 2, mb: 2 }}>
      {/* תווית על הטאבים - מבהירה ש"אלו הניווט הראשי" */}
      <Typography sx={{
        fontSize: 10, fontWeight: 700, color: 'text.disabled',
        letterSpacing: 1, textTransform: 'uppercase',
        mb: 0.75, px: 0.25,
      }}>
        עמוד התובנות
      </Typography>

      <Paper elevation={0} sx={{
        borderRadius: '16px', p: 0.5,
        border: '1.5px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.22)' : 'rgba(20,184,166,0.18)',
        backgroundImage: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.1) 0%, rgba(255,255,255,0.02) 100%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.07) 0%, rgba(255,255,255,0.8) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 3px 12px rgba(0,0,0,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.8), 0 3px 12px rgba(20,184,166,0.1), 0 6px 20px rgba(15,118,110,0.07)',
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            '& .MuiTabs-flexContainer': { gap: 0.3 },
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              borderRadius: '12px',
              minWidth: 0,
              px: 0.5,
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover:not(.Mui-selected)': {
                color: 'text.primary',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              },
              '&:active:not(.Mui-selected)': { transform: 'scale(0.96)' },
              '&.Mui-selected': {
                color: 'white',
                backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 16px rgba(20,184,166,0.5)',
                transform: 'translateY(-0.5px)',
                fontWeight: 800,
                fontSize: 12.5,
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
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.15 }}>
                  <Box sx={{ fontSize: 15, lineHeight: 1 }}>{emoji}</Box>
                  <Box sx={{ fontSize: 10.5, fontWeight: 'inherit', lineHeight: 1 }}>{label}</Box>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>
    </Box>
  );
};
