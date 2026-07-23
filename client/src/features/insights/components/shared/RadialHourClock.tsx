import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Radial Hour Clock - שעון פרימיום של 24 שעות =====
// משופר: גרדיאנט קונסטרי בקרניים, פעימת זוהר על שיא, חלוקה יום/לילה
// ברקע (תכלת/לבן), תיוג 24 השעות עם הדגשת 0/6/12/18, אנימציה מדורגת.
export const RadialHourClock = ({ hourlyActivity, isDark }: {
  hourlyActivity: number[]; isDark: boolean;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!hourlyActivity || hourlyActivity.every(v => v === 0)) return null;
  const max = Math.max(...hourlyActivity, 1);
  const peak = hourlyActivity.indexOf(max);

  const size = 220;
  const center = size / 2;
  const innerR = 40;
  const outerR = 96;
  const displayH = hovered !== null ? hovered : peak;
  const displayCount = hourlyActivity[displayH];
  const total = hourlyActivity.reduce((a, b) => a + b, 0);
  const displayPct = total > 0 ? Math.round((displayCount / total) * 100) : 0;

  // חצי-יום (5-17) רקע שמש בהיר; חצי-לילה (18-4) רקע סגלגל - מבדיל ויזואלית.
  // בנוי כשני semicircles בעזרת stroke-dasharray על circle.
  const dayLabel = displayH >= 5 && displayH <= 17 ? '☀️' : '🌙';

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: `${fadeIn} 0.5s ease both`,
    }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          <defs>
            {/* גרדיאנט קונסטרי לקרניים: כהה בפנים, בהיר בחוץ */}
            <linearGradient id="rayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#5EEAD4" />
            </linearGradient>
            <linearGradient id="rayGradPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            {/* glow filter */}
            <filter id="rayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* רקע יום/לילה - שני חצאי-מעגלים עדינים */}
          <path
            d={`M ${center} ${center - outerR - 4} A ${outerR + 4} ${outerR + 4} 0 0 1 ${center} ${center + outerR + 4}`}
            fill="none"
            stroke={isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.10)'}
            strokeWidth={3}
          />
          <path
            d={`M ${center} ${center + outerR + 4} A ${outerR + 4} ${outerR + 4} 0 0 1 ${center} ${center - outerR - 4}`}
            fill="none"
            stroke={isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.10)'}
            strokeWidth={3}
          />

          {/* טבעות רקע מדורגות */}
          {[0.4, 0.7, 1].map((r, i) => (
            <circle key={i} cx={center} cy={center} r={innerR + (outerR - innerR) * r}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
              strokeWidth={1}
              strokeDasharray={i === 2 ? 'none' : '2 4'}
            />
          ))}

          {/* tick marks קטנים בין השעות הראשיות */}
          {Array.from({ length: 24 }, (_, h) => {
            const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const isMain = h % 6 === 0;
            const r1 = outerR + 2;
            const r2 = outerR + (isMain ? 7 : 4);
            const x1 = center + Math.cos(angle) * r1;
            const y1 = center + Math.sin(angle) * r1;
            const x2 = center + Math.cos(angle) * r2;
            const y2 = center + Math.sin(angle) * r2;
            return (
              <line key={h} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.45)'}
                strokeWidth={isMain ? 1.5 : 0.8}
                strokeLinecap="round"
              />
            );
          })}

          {/* קרני שעות - אנימציה מדורגת */}
          {hourlyActivity.map((count, h) => {
            const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const intensity = count / max;
            const len = innerR + 4 + intensity * (outerR - innerR - 6);
            const x1 = center + Math.cos(angle) * (innerR + 2);
            const y1 = center + Math.sin(angle) * (innerR + 2);
            const x2 = center + Math.cos(angle) * len;
            const y2 = center + Math.sin(angle) * len;
            const isPeak = h === peak;
            const isHovered = h === hovered;
            const isActive = isPeak || isHovered;
            const stroke = count === 0
              ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
              : isPeak
                ? 'url(#rayGradPeak)'
                : isHovered
                  ? '#0D9488'
                  : 'url(#rayGrad)';
            return (
              <g key={h}>
                {/* glow underneath peak */}
                {isPeak && count > 0 && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#FBBF24" strokeWidth={11}
                    strokeLinecap="round"
                    opacity={0.5}
                    filter="url(#rayGlow)"
                    style={{ animation: 'peakPulse 2s ease-in-out infinite' }}
                  />
                )}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={stroke}
                  strokeWidth={isActive ? 7 : count > 0 ? 5 : 3}
                  strokeLinecap="round"
                  opacity={count === 0 ? 1 : Math.max(0.6, 0.4 + intensity * 0.6)}
                  onMouseEnter={() => setHovered(h)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'stroke-width 0.15s, opacity 0.15s',
                    transformOrigin: `${center}px ${center}px`,
                    animation: `rayDraw 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${h * 0.02}s both`,
                  }}
                />
              </g>
            );
          })}
          <style>{`
            @keyframes rayDraw {
              from { transform: scale(0.3); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes peakPulse {
              0%, 100% { opacity: 0.35; }
              50% { opacity: 0.7; }
            }
          `}</style>

          {/* תוויות 0/6/12/18 - גדולות יותר עם רקע מודגש */}
          {[0, 6, 12, 18].map(h => {
            const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
            const lx = center + Math.cos(angle) * (outerR + 18);
            const ly = center + Math.sin(angle) * (outerR + 18);
            return (
              <g key={h}>
                <circle cx={lx} cy={ly} r={11}
                  fill={isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.12)'}
                  stroke={isDark ? 'rgba(20,184,166,0.35)' : 'rgba(20,184,166,0.3)'}
                  strokeWidth={1}
                />
                <text x={lx} y={ly}
                  textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 10, fontWeight: 800, fill: isDark ? '#5EEAD4' : '#0F766E' }}>
                  {h}
                </text>
              </g>
            );
          })}
        </svg>

        {/* תווית מרכזית - עיגול עם טבעת זוהר */}
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Box sx={{
            width: innerR * 2 - 8, height: innerR * 2 - 8, borderRadius: '50%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backgroundImage: isDark
              ? 'radial-gradient(circle at center, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.05) 100%)'
              : 'radial-gradient(circle at center, rgba(20,184,166,0.12) 0%, rgba(255,255,255,0.7) 100%)',
            border: '1.5px solid',
            borderColor: isDark ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.25)',
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(20,184,166,0.18)'
              : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(20,184,166,0.12)',
          }}>
            <Typography sx={{ fontSize: 14, lineHeight: 1, mb: 0.15 }}>{dayLabel}</Typography>
            <Typography sx={{
              fontSize: 18, fontWeight: 900, color: isDark ? '#5EEAD4' : '#0D9488',
              lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              {String(displayH).padStart(2, '0')}:00
            </Typography>
            <Typography sx={{
              fontSize: 9, fontWeight: 700, color: 'text.secondary', mt: 0.25,
              letterSpacing: 0.3,
            }}>
              {displayCount > 0 ? `${displayPct}%` : '—'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* כיתוב מתחת - "השעה הפעילה ביותר" עם הדגשת השעה הספציפית */}
      <Typography sx={{
        fontSize: 11, color: 'text.secondary', mt: 1.5, fontWeight: 600,
      }}>
        {hovered !== null
          ? <>בשעה <Box component="span" sx={{ color: '#0D9488', fontWeight: 800 }}>{displayH}:00</Box> בוצעו {displayCount} פעולות</>
          : <>שיא הפעילות שלך — <Box component="span" sx={{ color: '#0D9488', fontWeight: 800 }}>{peak}:00</Box></>
        }
      </Typography>
    </Box>
  );
};
