// דגל משותף: true רק כשה-build version שהתגלה בעליית האפליקציה (App.tsx,
// handleNewVersion) שונה מהגרסה שנשמרה מהביקור הקודם - כלומר זה בהחלט
// משתמש חוזר שרץ אחרי דיפלוי חדש, לא מבקר ראשון (שאין לו storedVersion
// בכלל) ולא מישהו שכבר על הגרסה העדכנית. useConnectionStatus.ts משתמש בזה
// כדי להחליט אם חיבור תקוע (server-starting/reconnecting) כנראה נובע מ-JS
// ישן שקורא לחוזה API/socket שהשתנה - ולא סתם משרת קר או תקלת רשת רגילה,
// ששתיהן לא קשורות לגרסה ולא אמורות לגרום לריענון אוטומטי.
let versionUpgradeDetected = false;

export function markVersionUpgrade(): void {
  versionUpgradeDetected = true;
}

export function wasVersionUpgrade(): boolean {
  return versionUpgradeDetected;
}
