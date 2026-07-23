import { Typography, Paper } from '@mui/material';

interface PriceComparisonEmptyStatesProps {
  enabled: boolean;
  hasAnyPendingItems: boolean;
  hasChainData: boolean;
  selectedListName?: string | null;
  isDark: boolean;
}

// מצבים ריקים - המאגר עדיין לא נטען / אין פריטים שטרם נקנו / אין התאמות במאגר
export const PriceComparisonEmptyStates = ({ enabled, hasAnyPendingItems, hasChainData, selectedListName, isDark }: PriceComparisonEmptyStatesProps) => (
  <>
    {!enabled && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
          ⏳ המאגר עדיין לא נטען. ייבוא ראשוני יתבצע בקרוב.
        </Typography>
      </Paper>
    )}

    {enabled && !hasAnyPendingItems && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)', textAlign: 'center' }}>
        <Typography sx={{ fontSize: 32, mb: 0.5 }}>🛒</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
          {selectedListName
            ? <>אין מוצרים שטרם נקנו ברשימה "{selectedListName}".<br/>הוסף מוצרים לרשימה כדי לראות השוואה.</>
            : <>אין כרגע פריטים שטרם נקנו ברשימות שלך.<br/>הוסף מוצרים כדי לראות השוואה.</>}
        </Typography>
      </Paper>
    )}

    {enabled && hasAnyPendingItems && !hasChainData && (
      <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
          {selectedListName
            ? <>לא הצלחנו לזהות אף מוצר מהרשימה "{selectedListName}" במאגר. נסה שמות מדויקים יותר (לדוגמה: "חלב תנובה 3%" במקום "חלב").</>
            : 'לא הצלחנו לזהות אף אחד מהמוצרים שלך במאגר. נסה שמות מדויקים יותר (לדוגמה: "חלב תנובה 3%" במקום "חלב").'}
        </Typography>
      </Paper>
    )}
  </>
);
