import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Category Donut - דונאט אנימטיבי במקום בר שטוח =====
// SVG טהור, בלי תלות חיצונית. סיבוב הדרגתי, hover להגדלה,
// תווית במרכז עם הקטגוריה הנבחרת. הופך את "פילוח קטגוריות" מטבלה
// משעממת לוויזואליזציה שכיף להסתכל עליה.
export const CategoryDonut = ({ items, isDark }: {
  items: { category: string; count: number; percentage: number; color: string; icon: string; label: string }[];
  isDark: boolean;
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  if (!items || items.length === 0) return null;

  const size = 180;
  const center = size / 2;
  const radius = 70;
  const stroke = 28;
  const innerRadius = radius - stroke / 2;
  const total = items.reduce((s, c) => s + c.count, 0);
  const circumference = 2 * Math.PI * innerRadius;

  // נבחרת לתצוגה במרכז: hover או הראשונה
  const displayed = items.find(c => c.category === hovered) || items[0];

  // צבירת אורכי קשת לכל קטגוריה - reduce עם accumulator מקומי (לא let חיצוני)
  // כדי לא לבצע מוטציה על משתנה מחוץ ל-closure.
  const { arcs } = items.reduce<{ cumulative: number; arcs: (typeof items[number] & { length: number; offset: number; fraction: number })[] }>(
    (acc, item) => {
      const fraction = item.count / total;
      const length = fraction * circumference;
      const offset = -acc.cumulative * circumference - 0.25 * circumference; // התחלה ב-12:00
      acc.arcs.push({ ...item, length, offset, fraction });
      acc.cumulative += fraction;
      return acc;
    },
    { cumulative: 0, arcs: [] }
  );

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      animation: `${fadeIn} 0.45s ease both`,
    }}>
      {/* SVG דונאט */}
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(0deg)' }}>
          {/* רקע מעגל */}
          <circle
            cx={center} cy={center} r={innerRadius}
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
            strokeWidth={stroke}
          />
          {arcs.map((arc, i) => {
            const isActive = arc.category === displayed.category;
            return (
              <circle
                key={arc.category}
                cx={center} cy={center} r={innerRadius}
                fill="none"
                stroke={arc.color}
                strokeWidth={isActive ? stroke + 4 : stroke}
                strokeDasharray={`${arc.length} ${circumference}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                onMouseEnter={() => setHovered(arc.category)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setHovered(prev => prev === arc.category ? null : arc.category)}
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hovered && !isActive ? 0.55 : 1,
                  animation: `donutDraw 0.9s ease ${i * 0.05}s both`,
                }}
              />
            );
          })}
          <style>{`
            @keyframes donutDraw {
              from { stroke-dasharray: 0 ${circumference}; }
            }
          `}</style>
        </svg>
        {/* תווית במרכז */}
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', textAlign: 'center', px: 2,
        }}>
          <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{displayed.icon}</Typography>
          <Typography sx={{
            fontSize: 11.5, fontWeight: 800, color: 'text.primary', mt: 0.3, lineHeight: 1.1,
            maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayed.label}
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: displayed.color, mt: 0.2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {displayed.percentage}%
          </Typography>
        </Box>
      </Box>
      {/* legend */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {items.slice(0, 6).map((item) => {
          const isActive = item.category === displayed.category;
          return (
            <Box key={item.category}
              onMouseEnter={() => setHovered(item.category)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered(prev => prev === item.category ? null : item.category)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.6,
                px: 0.7, py: 0.4, borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: isActive ? `${item.color}18` : 'transparent',
                border: '1px solid', borderColor: isActive ? `${item.color}40` : 'transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: isActive ? 800 : 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                {item.percentage}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
