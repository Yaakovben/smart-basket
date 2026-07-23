import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';
import { haptic } from '../../../../../global/helpers';
import { fadeIn, SectionCard } from '../../insightsShared';

interface PulseWeeklyTrendProps {
  weeklyTrends: InsightsData['weeklyTrends'];
  isDark: boolean;
}

// "מגמה שבועית" - בר-צ'ארט של פריטים שנוספו/נקנו, לחיץ לפירוט שבוע ספציפי.
export const PulseWeeklyTrend = ({ weeklyTrends, isDark }: PulseWeeklyTrendProps) => {
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);
  const hasData = weeklyTrends && weeklyTrends.length > 0 && weeklyTrends.some(w => w.added + w.purchased > 0);
  if (!hasData) return null;

  // הערה: ה-`,1` ב-Math.max מונע חלוקה ב-0 כשאין כלל פעילות - בלעדיו בר זעיר
  // אחד היה נראה ויזואלית מקסימלי.
  const maxWeeklyTrend = Math.max(...weeklyTrends.map(w => Math.max(w.added, w.purchased)), 1);

  return (
    <SectionCard title="📊 מגמה שבועית" isDark={isDark}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 70, mb: 0.75 }}>
        {weeklyTrends.map((w, i) => {
          const isSelected = selectedWeekIdx === i;
          const hasActivity = w.added + w.purchased > 0;
          return (
            <Box
              key={i}
              onClick={() => {
                if (!hasActivity) return;
                haptic('light');
                setSelectedWeekIdx(prev => prev === i ? null : i);
              }}
              sx={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
                height: '100%', justifyContent: 'flex-end',
                cursor: hasActivity ? 'pointer' : 'default',
                borderRadius: '4px',
                p: isSelected ? '3px 2px' : '3px 0',
                bgcolor: isSelected ? (isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.12)') : 'transparent',
                transition: 'background 0.2s ease',
                '&:active': hasActivity ? { opacity: 0.8 } : {},
              }}
            >
              <Box sx={{
                height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                bgcolor: isSelected ? '#0D9488' : '#14B8A6',
                borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                transition: 'background 0.2s ease',
              }} />
              <Box sx={{
                height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`,
                bgcolor: isSelected
                  ? (isDark ? 'rgba(20,184,166,0.55)' : 'rgba(20,184,166,0.45)')
                  : (isDark ? 'rgba(20,184,166,0.35)' : 'rgba(20,184,166,0.25)'),
                borderRadius: '3px 3px 0 0', minHeight: w.added - w.purchased > 0 ? 2 : 0,
                transition: 'background 0.2s ease',
              }} />
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: '4px', mb: 0.75 }}>
        {weeklyTrends.map((w, i) => (
          <Typography key={i} sx={{
            flex: 1, fontSize: 8.5, textAlign: 'center',
            color: selectedWeekIdx === i ? '#14B8A6' : 'text.disabled',
            fontWeight: selectedWeekIdx === i ? 800 : 600,
          }}>
            {w.week}
          </Typography>
        ))}
      </Box>
      {selectedWeekIdx !== null && weeklyTrends[selectedWeekIdx] && (
        <Box sx={{
          p: 1, borderRadius: '10px', mb: 0.75,
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          animation: `${fadeIn} 0.2s ease both`,
        }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
            שבוע שהתחיל ב-<b>{weeklyTrends[selectedWeekIdx].week}</b>:
            {' '}<b>{weeklyTrends[selectedWeekIdx].added}</b> נוספו ·
            {' '}<b>{weeklyTrends[selectedWeekIdx].purchased}</b> נקנו
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: '#22C55E' }} />
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>נקנו</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)' }} />
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ממתינים</Typography>
        </Box>
      </Box>
    </SectionCard>
  );
};
