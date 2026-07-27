import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';
import { haptic } from '../../../../global/helpers';

interface CategoryDonutItem {
  category: string; count: number; percentage: number; color: string; icon: string; label: string;
}

// ===== Category Donut - דונאט אנימטיבי במקום בר שטוח =====
// SVG טהור, בלי תלות חיצונית. סיבוב הדרגתי, תווית במרכז עם הקטגוריה הנבחרת.
//
// selected/onSelect מגיעים מההורה (controlled) - קודם הרכיב ניהל בעצמו state
// פנימי (hover) שלא היה מסונכרן עם רשימת הקטגוריות שההורה מציג מתחת (ל-SpendingTab
// ול-HabitsCategoryBreakdown יש שתיהן רשימה חיצונית משלהן) - לחיצה על שורה ברשימה
// לא עדכנה את העוגה, ולחיצה על העוגה לא עדכנה את הרשימה. שני מקורות state
// לא-מסונכרנים לאותה בחירה בדיוק זה מה שגרם לתחושת "לא מגיב טוב".
export const CategoryDonut = ({ items, isDark, selected, onSelect }: {
  items: CategoryDonutItem[];
  isDark: boolean;
  selected: string | null;
  onSelect: (category: string) => void;
}) => {
  if (!items || items.length === 0) return null;

  const size = 180;
  const center = size / 2;
  const radius = 70;
  const stroke = 28;
  // hit-area בלתי-נראית ורחבה יותר מהקו הוויזואלי - בלי זה נגיעה שמפספסת
  // את הטבעת הדקה ב-1-2 פיקסלים (נפוץ מאוד במגע) פשוט לא עושה כלום.
  const hitStroke = 44;
  const innerRadius = radius - stroke / 2;
  const total = items.reduce((s, c) => s + c.count, 0);
  const circumference = 2 * Math.PI * innerRadius;

  // נבחרת לתצוגה במרכז: הנבחרת מבחוץ, או הראשונה כברירת מחדל
  const displayed = items.find(c => c.category === selected) || items[0];

  const handleSelect = (category: string) => {
    haptic('light');
    onSelect(category);
  };

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
      display: 'flex', justifyContent: 'center',
      animation: `${fadeIn} 0.45s ease both`,
    }}>
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
              <g key={arc.category} onClick={() => handleSelect(arc.category)} style={{ cursor: 'pointer' }}>
                {/* קו ויזואלי - דק, לא לוכד קליקים בעצמו */}
                <circle
                  cx={center} cy={center} r={innerRadius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isActive ? stroke + 4 : stroke}
                  strokeDasharray={`${arc.length} ${circumference}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="butt"
                  style={{
                    pointerEvents: 'none',
                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                    opacity: !isActive ? 0.55 : 1,
                    animation: `donutDraw 0.9s ease ${i * 0.05}s both`,
                  }}
                />
                {/* hit-area שקופה ורחבה - זו שבאמת לוכדת את הנגיעה/קליק */}
                <circle
                  cx={center} cy={center} r={innerRadius}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={hitStroke}
                  strokeDasharray={`${arc.length} ${circumference}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="butt"
                />
              </g>
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
    </Box>
  );
};
