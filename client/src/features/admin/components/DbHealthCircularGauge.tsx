import { Box, Typography } from '@mui/material';

interface DbHealthCircularGaugeProps {
  percent: number;
  color: string;
  isDark: boolean;
}

// כפתור עיגולי גדול שמראה אחוז ניצול - הכי ויזואלי שיש.
export const DbHealthCircularGauge = ({ percent, color, isDark }: DbHealthCircularGaugeProps) => {
  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>
          {percent.toFixed(1)}
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.secondary', mt: 0.5 }}>
          % בשימוש
        </Typography>
      </Box>
    </Box>
  );
};
