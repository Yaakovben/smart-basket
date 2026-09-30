/**
 * מפתח השוואה לכתובת: רחוב ומספר בית, בלי מילות תחילית ("רחוב", "שד'", "דרך") ופיסוק.
 * משמש להתאמת סניף רשמי בלי מיקום לנקודת החנות שלו ב-OpenStreetMap (אותה רשת, אותו
 * רחוב ומספר, באותה עיר). כתובת בלי מספר בית לא מקבלת מפתח: רחוב לבד לא מזהה חנות.
 */
export function addressKey(address: string | undefined): string | null {
  const n = (address ?? '')
    .replace(/&#x0?[dDaA];/g, ' ')
    .replace(/(^|\s)(רח(וב)?['׳]?|שד(רות)?['׳]?|דרך)(?=\s)/g, ' ')
    .replace(/["'׳״.,()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const m = n.match(/^(.+?)\s+(\d+)(?!\d)/);
  return m ? `${m[1]}|${m[2]}` : null;
}
