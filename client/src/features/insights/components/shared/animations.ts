import { keyframes } from '@mui/material';

// אנימציות משותפות לעמוד התובנות
export const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
export const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;
// מעבר טאבים: שילוב של fade + slide קטן - תחושת מעבר חלק בלי להסיח את העין
export const tabEnter = keyframes`from{opacity:0;transform:translateY(12px) scale(0.99)}to{opacity:1;transform:translateY(0) scale(1)}`;

export const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';
