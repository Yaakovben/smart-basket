import { Box } from '@mui/material';

// הופך **טקסט** למודגש בפועל (bold), לא משאיר את הכוכביות הגולמיות על
// המסך - ה-AI כותב markdown פשוט להדגשה, אבל התוכן מוצג כטקסט רגיל בכל
// מקום שלא מפענח אותו (צ'אט, ניתוח רשימה). פונקציה משותפת כדי ששני
// המקומות יתנהגו אותו דבר ולא יסטו זה מזה עם הזמן.
export function renderInlineBold(text: string, keyPrefix = ''): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Box key={`${keyPrefix}${i}`} component="span" sx={{ fontWeight: 800 }}>{part}</Box>
      : part
  );
}
