import { Box } from '@mui/material';
import { AiAssistantIcon } from '../../../global/components';

const ORBIT_DOTS = [
  { color: '#A78BFA', duration: '1.6s', delay: '0s', size: 6 },
  { color: '#2DD4BF', duration: '1.6s', delay: '-0.53s', size: 5 },
  { color: '#ffffff', duration: '1.6s', delay: '-1.06s', size: 4 },
];

// אינדיקטור "ה-AI חושב" - גרעין זוהר פועם עם אייקון הניצוצות במרכז, ושלוש
// "אלקטרונים" שמקיפים אותו במסלול מסתובב, בעיכובי אנימציה שונים כך שכל
// נקודה במקום אחר במעגל בכל רגע נתון. כל האנימציה ב-CSS טהור (sx/keyframes)
// - בלי תלות בספרייה חיצונית, קלת-משקל וזורמת גם על מכשירים חלשים.
export const AiThinkingIndicator = () => (
  <Box sx={{
    position: 'relative', width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {/* זוהר רך פועם ברקע */}
    <Box sx={{
      position: 'absolute', inset: -6, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(167,139,250,0.45) 0%, rgba(45,212,191,0.25) 55%, transparent 75%)',
      filter: 'blur(4px)',
      animation: 'aiThinkGlow 1.8s ease-in-out infinite',
      '@keyframes aiThinkGlow': {
        '0%, 100%': { opacity: 0.5, transform: 'scale(0.85)' },
        '50%': { opacity: 1, transform: 'scale(1.15)' },
      },
    }} />

    {/* גרעין מרכזי */}
    <Box sx={{
      position: 'relative', width: 26, height: 26, borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #A78BFA 0%, #2DD4BF 100%)',
      animation: 'aiThinkPulse 1.8s ease-in-out infinite',
      '@keyframes aiThinkPulse': {
        '0%, 100%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.12)' },
      },
    }}>
      <AiAssistantIcon sx={{
        fontSize: 15, color: 'white',
        animation: 'aiThinkSpin 3.2s linear infinite',
        '@keyframes aiThinkSpin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
      }} />
    </Box>

    {/* מסלולי "אלקטרונים" - כל שכבה מסתובבת שלמה, עם נקודה יחידה בקצה העליון */}
    {ORBIT_DOTS.map((dot, i) => (
      <Box
        key={i}
        aria-hidden="true"
        sx={{
          position: 'absolute', inset: 0,
          animation: `aiThinkOrbit ${dot.duration} linear infinite`,
          animationDelay: dot.delay,
          '@keyframes aiThinkOrbit': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        }}
      >
        <Box sx={{
          position: 'absolute', top: -1, left: '50%',
          width: dot.size, height: dot.size, borderRadius: '50%',
          bgcolor: dot.color,
          boxShadow: `0 0 6px ${dot.color}`,
          transform: 'translateX(-50%)',
        }} />
      </Box>
    ))}
  </Box>
);
