// עיצוב מחיר בשקלים - פונקציה יחידה ומרכזית במקום כל קומפוננטה מטמיעה
// בעצמה `₪${value.toFixed(N)}`, מה שיצר עיגול לא-עקבי (toFixed(0) מול
// toFixed(2)) בין מסכים שונים.
export const formatILS = (value: number, decimals: 0 | 2 = 0): string =>
  `₪${value.toFixed(decimals)}`;
