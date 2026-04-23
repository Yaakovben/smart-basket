import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// לודר יצירתי לתובנות: נורה עם אימוג'ים מקיפים (📊 📈 💡 🛒) שמתחלפים במעגל.
// משמש גם במסך הטעינה הראשי וגם בטעינות פנימיות כשמחליפים טאב או טוענים חלק.

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: 0.85; }
`;

const ORBIT_EMOJIS = ['📊', '📈', '💡', '🛒'];

interface Props {
  // טקסט אופציונלי מתחת ללודר. אם חסר — הלודר לבד בלי טקסט.
  text?: string;
  // גודל: md לטעינה מלאה, sm לטעינות פנימיות קצרות.
  size?: 'sm' | 'md';
  // צבע נושא (accent) - ברירת מחדל טורקיז (לתובנות).
  accent?: string;
}

export const InsightsLoader = memo(({ text, size = 'md', accent = '#14B8A6' }: Props) => {
  const boxPx = size === 'sm' ? 54 : 88;
  const centerPx = size === 'sm' ? 28 : 46;
  const emojiPx = size === 'sm' ? 13 : 18;
  // רדיוס המסלול - חצי מגודל הקופסה פחות גודל האמוג'י הקטן
  const radius = boxPx / 2 - emojiPx / 2 - 2;

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: size === 'sm' ? 1 : 1.5,
      py: size === 'sm' ? 2.5 : 4,
    }} role="status" aria-live="polite">
      {/* קונטיינר המסלול המסתובב */}
      <Box sx={{
        position: 'relative',
        width: boxPx, height: boxPx,
      }}>
        {/* עיגול נושא מרכזי עם פעימה */}
        <Box sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: centerPx, height: centerPx,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${accent}, ${accent}C0)`,
          boxShadow: `0 4px 16px ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: `${pulse} 1.4s ease-in-out infinite`,
        }}>
          <Typography sx={{ fontSize: size === 'sm' ? 16 : 22, lineHeight: 1 }}>💡</Typography>
        </Box>
        {/* האמוג'ים המסתובבים - כל האמוג'ים מחוברים ל-box אחד שמסתובב */}
        <Box sx={{
          position: 'absolute', inset: 0,
          animation: `${spin} 2.8s linear infinite`,
        }}>
          {ORBIT_EMOJIS.map((emoji, i) => {
            const angle = (i / ORBIT_EMOJIS.length) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: emojiPx, height: emojiPx,
                  marginTop: -emojiPx / 2,
                  marginLeft: -emojiPx / 2,
                  transform: `translate(${x}px, ${y}px)`,
                  fontSize: emojiPx,
                  lineHeight: 1,
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                {emoji}
              </Box>
            );
          })}
        </Box>
      </Box>

      {text && (
        <Typography sx={{
          fontSize: size === 'sm' ? 11.5 : 13,
          color: 'text.secondary',
          fontWeight: 500,
          mt: 0.5,
        }}>
          {text}
        </Typography>
      )}
    </Box>
  );
});

InsightsLoader.displayName = 'InsightsLoader';
