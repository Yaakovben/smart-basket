/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, keyframes } from '@mui/material';

// כלי עזר: ימים יחסיים בעברית מדויקת ("3 ימים", "יום", "שבוע")
const formatDaysHebrew = (days: number): string => {
  if (days <= 0) return 'היום';
  if (days === 1) return 'יום';
  if (days === 2) return 'יומיים';
  if (days < 7) return `${days} ימים`;
  if (days < 14) return 'שבוע';
  if (days < 30) return `${Math.round(days / 7)} שבועות`;
  return `${Math.round(days / 30)} חודשים`;
};

// אנימציות משותפות לעמוד התובנות
export const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
export const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;
// מעבר טאבים: שילוב של fade + slide קטן - תחושת מעבר חלק בלי להסיח את העין
export const tabEnter = keyframes`from{opacity:0;transform:translateY(12px) scale(0.99)}to{opacity:1;transform:translateY(0) scale(1)}`;

export const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';

// ספירה אנימטיבית
export const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 700;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <>{display}</>;
};

// ===== כרטיס סטטיסטיקה קטן - לשימוש חוזר ברחבי העמוד =====
export const StatCard = ({ value, label, color, bg, border }: {
  value: React.ReactNode; label: string; color: string; bg: string; border: string;
}) => (
  <Paper elevation={0} sx={{
    p: 1.25, borderRadius: '12px', textAlign: 'center',
    background: `linear-gradient(135deg, ${bg}, ${bg} 55%, transparent 130%)`,
    border: `1px solid ${border}`,
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
  }}>
    <Typography sx={{
      fontSize: 20, fontWeight: 900, color, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</Typography>
    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.4 }}>{label}</Typography>
  </Paper>
);

// ===== כרטיס קטע (ספציפי לעמוד) =====
export const SectionCard = ({ title, children, isDark }: {
  title: string; children: React.ReactNode; isDark: boolean;
}) => (
  <Paper elevation={0} sx={{
    p: 2, mb: 2, borderRadius: '16px',
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    animation: `${fadeIn} 0.35s ease both`,
  }}>
    <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>{title}</Typography>
    {children}
  </Paper>
);

// ===== מסך ריק עם דמות חמודה - דמות מרכזית, פריטים מרחפים, וטקסט CTA =====
// שימוש: <InsightsEmptyState mainEmoji="🛍️" title="..." description="..." floatingItems={['🥕','🍞']} accent="#14B8A6" />
export const InsightsEmptyState = ({
  mainEmoji,
  title,
  description,
  floatingItems = ['✨', '⭐', '💫', '🌟'],
  accent = '#14B8A6',
  isDark,
}: {
  mainEmoji: string;
  title: string;
  description: string;
  floatingItems?: string[];
  accent?: string;
  isDark: boolean;
}) => (
  <Box sx={{
    textAlign: 'center', py: { xs: 4, sm: 6 },
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    animation: `${fadeIn} 0.5s ease`,
  }}>
    {/* דמות חמודה - אייקון מרכזי + halo + 4 פריטים מרחפים */}
    <Box sx={{ position: 'relative', width: 180, height: 180, mb: 2 }}>
      {/* halo gradient פולסים */}
      <Box sx={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: isDark
          ? `radial-gradient(circle at center, ${accent}33, ${accent}08 70%)`
          : `radial-gradient(circle at center, ${accent}25, ${accent}05 70%)`,
        animation: `iesPulse 3s ease-in-out infinite`,
        '@keyframes iesPulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
          '50%': { transform: 'scale(1.08)', opacity: 1 },
        },
      }} />
      {/* אייקון מרכזי - צף */}
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 76,
        animation: `iesFloat 3s ease-in-out infinite`,
        '@keyframes iesFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      }}>
        {mainEmoji}
      </Box>
      {/* פריטים מרחפים בקצוות */}
      {floatingItems.slice(0, 4).map((emoji, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          fontSize: 22,
          top: ['10%', '12%', '70%', '68%'][i],
          left: ['10%', '78%', '8%', '78%'][i],
          animation: `iesItem 2.8s ease-in-out ${i * 0.3}s infinite`,
          '@keyframes iesItem': {
            '0%, 100%': { transform: 'translateY(0) rotate(-5deg)', opacity: 0.85 },
            '50%': { transform: 'translateY(-10px) rotate(5deg)', opacity: 1 },
          },
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}>
          {emoji}
        </Box>
      ))}
    </Box>
    <Typography sx={{ fontSize: 17, fontWeight: 800, mb: 0.75, color: 'text.primary' }}>
      {title}
    </Typography>
    <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 300, mx: 'auto', lineHeight: 1.55, px: 2 }}>
      {description}
    </Typography>
  </Box>
);

// ===== כרטיס אישיות קנייה =====
// מציג את ה-shoppingPersonality שכבר מחושב בשרת (השף, היעיל, וכו׳).
// כרטיס גדול ומרשים - גרדיאנט, אמוג'י ענק, תיאור. כניסה אנימטיבית.
// מטרה: לתת למשתמש זהות מיידית ויזואלית. "אני סוג כזה של קונה!"
export const PersonalityCard = ({ personality, isDark }: {
  personality: { type: string; emoji: string; description: string };
  isDark: boolean;
}) => (
  <Box sx={{
    position: 'relative', mb: 2, p: 2.25, borderRadius: '20px',
    background: isDark
      ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)'
      : 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #F472B6 100%)',
    color: 'white',
    boxShadow: '0 10px 30px rgba(139,92,246,0.32)',
    overflow: 'hidden',
    animation: `${fadeIn} 0.5s ease 0.1s both`,
  }}>
    {/* קישוטי רקע - שני עיגולים מטושטשים לעומק */}
    <Box sx={{
      position: 'absolute', top: -40, right: -30, width: 140, height: 140,
      borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)',
      pointerEvents: 'none',
    }} />
    <Box sx={{
      position: 'absolute', bottom: -50, left: -40, width: 130, height: 130,
      borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.08)',
      pointerEvents: 'none',
    }} />
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75 }}>
      {/* אמוג'י עם hover-bounce עדין */}
      <Box sx={{
        width: 68, height: 68, flexShrink: 0,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 38, lineHeight: 1,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 14px rgba(0,0,0,0.15)',
        animation: 'persFloat 3.2s ease-in-out infinite',
        '@keyframes persFloat': {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-4px) rotate(2deg)' },
        },
      }}>
        {personality.emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
          opacity: 0.92, textTransform: 'uppercase',
        }}>
          האישיות שלך
        </Typography>
        <Typography sx={{
          fontSize: 22, fontWeight: 900, lineHeight: 1.15, mt: 0.2,
          letterSpacing: -0.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}>
          {personality.type}
        </Typography>
        <Typography sx={{
          fontSize: 11.5, opacity: 0.93, mt: 0.5, lineHeight: 1.45,
        }}>
          {personality.description}
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ===== Achievement Badges - שורה של תגי הישגים =====
// מחושבים בלקוח מנתונים שכבר יש (totalPurchased, currentWeeks, completionRate וכו׳).
// כל badge הוא "מטרה" שהמשתמש כבר השיג - מקור גאווה, גורם לחזור.
type Achievement = { emoji: string; label: string; tone: string };

export const computeAchievements = (params: {
  totalPurchased: number;
  totalLists: number;
  currentWeeks: number;
  longestWeeks: number;
  completionRate: number;
  categoryCount: number;
}): Achievement[] => {
  const out: Achievement[] = [];
  if (params.totalPurchased >= 100) out.push({ emoji: '💯', label: '100 פריטים', tone: '#F59E0B' });
  else if (params.totalPurchased >= 50) out.push({ emoji: '🎯', label: '50 פריטים', tone: '#F59E0B' });
  else if (params.totalPurchased >= 10) out.push({ emoji: '✨', label: 'התחלה טובה', tone: '#14B8A6' });
  if (params.completionRate >= 90) out.push({ emoji: '🏆', label: 'מדייק', tone: '#10B981' });
  else if (params.completionRate >= 75) out.push({ emoji: '⚡', label: 'יעיל', tone: '#10B981' });
  if (params.currentWeeks >= 4) out.push({ emoji: '🔥', label: `סטריק ${params.currentWeeks} שבועות`, tone: '#EF4444' });
  else if (params.currentWeeks >= 2) out.push({ emoji: '🔥', label: `${params.currentWeeks} שבועות רצוף`, tone: '#EF4444' });
  if (params.longestWeeks >= 8 && params.longestWeeks > params.currentWeeks) out.push({ emoji: '🚀', label: `שיא ${params.longestWeeks} שבועות`, tone: '#8B5CF6' });
  if (params.categoryCount >= 8) out.push({ emoji: '🌈', label: 'מגוון מאוד', tone: '#EC4899' });
  else if (params.categoryCount >= 5) out.push({ emoji: '🎨', label: 'מגוון', tone: '#EC4899' });
  if (params.totalLists >= 5) out.push({ emoji: '📚', label: `${params.totalLists} רשימות`, tone: '#3B82F6' });
  return out;
};

export const AchievementBadges = ({ items, isDark }: {
  items: Achievement[];
  isDark: boolean;
}) => {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.disabled', letterSpacing: 0.5, mb: 0.85, px: 0.25 }}>
        🏅 ההישגים שלך
      </Typography>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 0.6,
      }}>
        {items.map((a, i) => (
          <Box key={i} sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.45,
            px: 1, py: 0.5, borderRadius: '999px',
            bgcolor: isDark ? `${a.tone}22` : `${a.tone}14`,
            border: '1.5px solid', borderColor: `${a.tone}55`,
            animation: `${fadeIn} 0.4s ease ${0.05 * i}s both`,
            transition: 'transform 0.15s ease, box-shadow 0.2s ease',
            '&:hover': { boxShadow: `0 3px 10px ${a.tone}40`, transform: 'translateY(-1px)' },
          }}>
            <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{a.emoji}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: a.tone, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {a.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ===== כרטיס "מוצרים שאולי שכחת" - friendly nudge =====
// מציג מוצרים שלא נראו לאחרונה ברשימות פעילות. מטרה: trigger רגשי
// ("אה נכון! שכחתי") שגורם למשתמש להוסיף לרשימה.
export const ForgottenProductsCard = ({ items, isDark }: {
  items: { name: string; lastSeen: string; category: string }[];
  isDark: boolean;
}) => {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{
      mb: 2, p: 1.75, borderRadius: '16px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(20,184,166,0.05))'
        : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(20,184,166,0.04))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
      animation: `${fadeIn} 0.45s ease 0.1s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
        <Typography sx={{ fontSize: 18 }}>🤔</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            אולי שכחת?
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.15 }}>
            מוצרים שקנית בעבר אבל לא הופיעו לאחרונה
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {items.slice(0, 5).map((p, i) => {
          const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 86_400_000));
          return (
            <Box key={i} sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.5, borderRadius: '10px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.2)',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>
                {p.name}
              </Typography>
              <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>
                · לפני {daysAgo}י׳
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ===== Spotlight Product - המוצר הנקנה ביותר כ-hero ראווה =====
// אמוג'י-קטגוריה ענק על רקע גרדיאנט, שם המוצר, ספירה גדולה.
// משתמש בנתונים הקיימים של topProducts אבל נותן להם זוהר.
export const SpotlightProduct = ({ name, count, icon, isDark }: {
  name: string; count: number; icon: string; isDark: boolean;
}) => (
  <Box sx={{
    position: 'relative', mb: 2, p: 2, borderRadius: '20px',
    background: isDark
      ? 'linear-gradient(135deg, #F59E0B 0%, #EA580C 60%, #DC2626 100%)'
      : 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 60%, #F97316 100%)',
    color: 'white',
    boxShadow: '0 10px 28px rgba(245,158,11,0.35)',
    overflow: 'hidden',
    animation: `${fadeIn} 0.5s ease 0.05s both`,
  }}>
    {/* קרניים מסביב - "כוכב המופע" */}
    <Box sx={{
      position: 'absolute', top: '50%', right: -30,
      width: 160, height: 160, transform: 'translateY(-50%)',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 60%)',
      pointerEvents: 'none',
    }} />
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.75 }}>
      <Box sx={{
        width: 76, height: 76, flexShrink: 0,
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.22)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 42, lineHeight: 1,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.2)',
        animation: 'spotPulse 2.6s ease-in-out infinite',
        '@keyframes spotPulse': {
          '0%, 100%': { transform: 'scale(1) rotate(-3deg)' },
          '50%': { transform: 'scale(1.06) rotate(3deg)' },
        },
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6,
          opacity: 0.92, textTransform: 'uppercase',
        }}>
          ⭐ המוצר המוביל שלך
        </Typography>
        <Typography sx={{
          fontSize: 22, fontWeight: 900, lineHeight: 1.15, mt: 0.2,
          letterSpacing: -0.4,
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </Typography>
        <Typography sx={{
          fontSize: 12, opacity: 0.95, mt: 0.4, lineHeight: 1.4, fontWeight: 600,
        }}>
          קנית <Typography component="span" sx={{ fontWeight: 900, fontSize: 14 }}>{count}</Typography> פעמים — האהוב שלך 💚
        </Typography>
      </Box>
    </Box>
  </Box>
);

// ===== Smart Tips Carousel - תובנות חכמות מתחלפות =====
// מציג תובנה אחת בכל פעם, מתחלף אוטומטית כל 5 שניות. אפשר ללחוץ
// על נקודות ההתקדמות כדי לדלג. רכיב ויזואלי שמרגיש "חי" ומעודד הסתכלות.
export const SmartTipsCarousel = ({ tips, isDark }: {
  tips: string[]; isDark: boolean;
}) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (tips.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx(i => (i + 1) % tips.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [tips.length]);

  if (!tips || tips.length === 0) return null;

  return (
    <Box sx={{
      mb: 2, p: 1.5, borderRadius: '14px',
      background: isDark
        ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(20,184,166,0.08))'
        : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(20,184,166,0.05))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.22)',
      animation: `${fadeIn} 0.45s ease both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.8 }}>
        <Typography sx={{ fontSize: 18, lineHeight: 1, mt: 0.15 }}>💡</Typography>
        <Box sx={{ flex: 1, minHeight: 36 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.disabled', letterSpacing: 0.5, mb: 0.35 }}>
            תובנה חכמה
          </Typography>
          <Typography
            key={idx}
            sx={{
              fontSize: 12.5, fontWeight: 600, color: 'text.primary',
              lineHeight: 1.5,
              animation: `${fadeIn} 0.4s ease both`,
            }}
          >
            {tips[idx]}
          </Typography>
        </Box>
      </Box>
      {/* נקודות התקדמות - לחיצות לדילוג ידני */}
      {tips.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
          {tips.map((_, i) => (
            <Box
              key={i}
              role="button"
              aria-label={`תובנה ${i + 1}`}
              onClick={() => setIdx(i)}
              sx={{
                width: i === idx ? 18 : 6, height: 6, borderRadius: '3px',
                bgcolor: i === idx ? '#6366F1' : (isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.22)'),
                cursor: 'pointer',
                transition: 'width 0.3s ease, background 0.2s',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

// ===== "השעה הזהובה" - הזמן שבו המשתמש הכי פעיל =====
// משתמש ב-hourlyActivity שכבר מחושב. מציג טקסט אישי עם השעה השיא
// ופרשנות אנושית ("אתה איש בוקר", "ינשוף לילה" וכו׳).
export const GoldenHourCard = ({ hourlyActivity }: {
  hourlyActivity: number[]; isDark?: boolean;
}) => {
  if (!hourlyActivity || hourlyActivity.every(v => v === 0)) return null;
  const peak = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  const total = hourlyActivity.reduce((a, b) => a + b, 0);
  const peakPct = total > 0 ? Math.round((hourlyActivity[peak] / total) * 100) : 0;

  // פרשנות זמן ביום
  let label: string; let emoji: string; let gradient: string;
  if (peak >= 5 && peak < 11) {
    label = 'איש בוקר'; emoji = '🌅';
    gradient = 'linear-gradient(135deg, #FBBF24, #F59E0B, #F97316)';
  } else if (peak >= 11 && peak < 16) {
    label = 'אנרגיית צהריים'; emoji = '☀️';
    gradient = 'linear-gradient(135deg, #FCD34D, #FBBF24, #F59E0B)';
  } else if (peak >= 16 && peak < 21) {
    label = 'איש ערב'; emoji = '🌆';
    gradient = 'linear-gradient(135deg, #F472B6, #EC4899, #BE185D)';
  } else {
    label = 'ינשוף לילה'; emoji = '🌙';
    gradient = 'linear-gradient(135deg, #6366F1, #4F46E5, #1E1B4B)';
  }

  return (
    <Box sx={{
      mb: 2, p: 1.5, borderRadius: '14px',
      background: gradient, color: 'white',
      display: 'flex', alignItems: 'center', gap: 1.25,
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      animation: `${fadeIn} 0.45s ease 0.15s both`,
    }}>
      <Typography sx={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{emoji}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, opacity: 0.92, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          השעה הזהובה
        </Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, mt: 0.15 }}>
          אתה <Typography component="span" sx={{ fontWeight: 900 }}>{label}</Typography>
        </Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.92, mt: 0.25 }}>
          שיא פעילות ב-{peak}:00 · {peakPct}% מהפעולות
        </Typography>
      </Box>
    </Box>
  );
};

// ===== Group Leadership Hero - "אתה מוביל ב-X קבוצות" =====
// מציג סטטוס מנהיגות מצרפי על פני כל הקבוצות. אם המשתמש מקום ראשון
// בכמה - תצוגה צוהלת. אם לא - עידוד עדין.
export const GroupLeadershipHero = ({ leadingCount, totalGroups }: {
  leadingCount: number; totalGroups: number; isDark?: boolean;
}) => {
  if (totalGroups === 0) return null;

  const isWinner = leadingCount > 0;
  const gradient = isWinner
    ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #DC2626 100%)'
    : 'linear-gradient(135deg, #14B8A6, #0D9488)';
  const emoji = isWinner ? (leadingCount >= 2 ? '👑' : '🏆') : '🤝';
  const title = isWinner
    ? leadingCount === totalGroups
      ? 'מלך הקבוצות'
      : `מוביל ב-${leadingCount} ${leadingCount === 1 ? 'קבוצה' : 'קבוצות'}`
    : `שותף ב-${totalGroups} ${totalGroups === 1 ? 'קבוצה' : 'קבוצות'}`;
  const subtitle = isWinner
    ? leadingCount === totalGroups
      ? 'מקום ראשון בכל קבוצה — מדהים!'
      : `מתוך ${totalGroups} סך הכל`
    : 'הוסף עוד פריטים כדי להיות מוביל';

  return (
    <Box sx={{
      mb: 2, p: 1.75, borderRadius: '16px',
      background: gradient, color: 'white',
      display: 'flex', alignItems: 'center', gap: 1.5,
      boxShadow: isWinner
        ? '0 8px 24px rgba(245,158,11,0.4)'
        : '0 6px 18px rgba(20,184,166,0.3)',
      animation: `${fadeIn} 0.5s ease 0.05s both`,
      position: 'relative', overflow: 'hidden',
    }}>
      {isWinner && (
        <Box sx={{
          position: 'absolute', top: -25, left: -25, width: 110, height: 110,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)',
        }} />
      )}
      <Box sx={{
        fontSize: 38, lineHeight: 1, flexShrink: 0, zIndex: 1,
        animation: isWinner ? 'crownBounce 2.4s ease-in-out infinite' : 'none',
        '@keyframes crownBounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-3px) scale(1.05)' },
        },
      }}>
        {emoji}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.15, letterSpacing: -0.3 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 11.5, opacity: 0.92, mt: 0.3 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
};

export { formatDaysHebrew };

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

  // צבירת אורכי קשת לכל קטגוריה
  let cumulative = 0;
  const arcs = items.map(item => {
    const fraction = item.count / total;
    const length = fraction * circumference;
    const offset = -cumulative * circumference - 0.25 * circumference; // התחלה ב-12:00
    cumulative += fraction;
    return { ...item, length, offset, fraction };
  });

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

// ===== Month Recap Card - "החודש שלך" בסגנון Spotify Wrapped =====
// כרטיס גדול שמתחלף אוטומטית בין 4-5 עובדות מרכזיות על החודש האחרון.
// גרדיאנט מאמיר, אמוג'י ענק, מספר אדיר. כל סלייד מקבל 4 שניות.
type RecapSlide = { emoji: string; headline: React.ReactNode; sub: string; gradient: string };

export const MonthRecapCard = ({ slides, isDark: _isDark }: {
  slides: RecapSlide[]; isDark: boolean;
}) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 4000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (!slides || slides.length === 0) return null;
  const s = slides[idx];

  return (
    <Box sx={{
      position: 'relative', mb: 2, p: 2.25, borderRadius: '20px',
      background: s.gradient, color: 'white',
      boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
      overflow: 'hidden', minHeight: 130,
      transition: 'background 0.6s ease',
      animation: `${fadeIn} 0.5s ease both`,
    }}>
      {/* רקעים דקורטיביים */}
      <Box sx={{
        position: 'absolute', top: -50, right: -40, width: 170, height: 170,
        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.13)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -60, left: -30, width: 150, height: 150,
        borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography sx={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, opacity: 0.92, textTransform: 'uppercase', mb: 0.5,
        }}>
          ✨ החודש שלך
        </Typography>
        <Box key={idx} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          animation: `${fadeIn} 0.45s ease both`,
        }}>
          <Typography sx={{
            fontSize: 56, lineHeight: 1, flexShrink: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.18)',
            animation: 'recapPop 0.7s ease both',
            '@keyframes recapPop': {
              from: { transform: 'scale(0.6) rotate(-10deg)', opacity: 0 },
              to: { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            },
          }}>
            {s.emoji}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: 22, fontWeight: 900, lineHeight: 1.15, letterSpacing: -0.4,
              textShadow: '0 1px 4px rgba(0,0,0,0.18)',
              '& b': { fontWeight: 900, fontSize: 26 },
            }}>
              {s.headline}
            </Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.92, mt: 0.5, lineHeight: 1.4 }}>
              {s.sub}
            </Typography>
          </Box>
        </Box>
        {/* dots */}
        {slides.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.4, mt: 1.25 }}>
            {slides.map((_, i) => (
              <Box key={i}
                onClick={() => setIdx(i)}
                sx={{
                  width: i === idx ? 22 : 6, height: 5, borderRadius: '3px',
                  bgcolor: i === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  cursor: 'pointer', transition: 'width 0.3s ease',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ===== Score Trend Badge - מציין השינוי בציון מאז הביקור הקודם =====
// משתמש ב-localStorage לשמור את הציון האחרון שראינו. תווית קטנה
// שמופיעה ליד הציון בדופק: "+5 השבוע" או "-2".
export const useScoreDelta = (currentScore: number): number | null => {
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const KEY = 'sb_last_score_seen';
    try {
      const raw = window.localStorage.getItem(KEY);
      const last = raw ? parseInt(raw, 10) : NaN;
      if (!isNaN(last) && last !== currentScore) {
        setDelta(currentScore - last);
      }
      window.localStorage.setItem(KEY, String(currentScore));
    } catch {
      // safeStorage לא נחוץ כאן - נכשל בשקט אם localStorage חסום
    }
  }, [currentScore]);
  return delta;
};

export const ScoreTrendBadge = ({ delta }: { delta: number | null }) => {
  if (delta === null || delta === 0) return null;
  const positive = delta > 0;
  const color = positive ? '#10B981' : '#EF4444';
  const arrow = positive ? '▲' : '▼';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.25,
      px: 0.7, py: 0.25, borderRadius: '999px',
      bgcolor: `${color}1A`,
      border: `1.5px solid ${color}40`,
      animation: `${fadeIn} 0.4s ease 0.5s both`,
    }}>
      <Typography sx={{ fontSize: 8.5, color, fontWeight: 800, lineHeight: 1 }}>{arrow}</Typography>
      <Typography sx={{ fontSize: 10, color, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {positive ? '+' : ''}{delta}
      </Typography>
    </Box>
  );
};

// ===== שורת כותרת אישית בראש כל טאב - מסגור חם אחד, לא עמוס =====
export const HeroInsight = ({ icon, text, accent, isDark }: {
  icon: string;
  text: React.ReactNode;
  accent: string;
  isDark: boolean;
}) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.25,
    px: 1.5, py: 1.25, mb: 1.75, borderRadius: '14px',
    background: isDark
      ? `linear-gradient(135deg, ${accent}18, ${accent}06 75%)`
      : `linear-gradient(135deg, ${accent}12, ${accent}03 75%)`,
    border: '1px solid', borderColor: isDark ? `${accent}2A` : `${accent}22`,
    animation: `${fadeIn} 0.4s ease both`,
  }}>
    <Box sx={{
      width: 36, height: 36, flexShrink: 0,
      borderRadius: '10px', bgcolor: isDark ? `${accent}28` : `${accent}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19,
    }}>
      {icon}
    </Box>
    <Typography sx={{
      flex: 1, fontSize: 13, color: 'text.primary', lineHeight: 1.5,
      '& b': { color: accent, fontWeight: 800 },
    }}>
      {text}
    </Typography>
  </Box>
);
