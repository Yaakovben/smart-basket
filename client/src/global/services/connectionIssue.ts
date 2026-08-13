// ערוץ קטן לדיווח על כשל fetch בטעינה הראשונית (רשימות/התראות) - מאפשר
// ל-OfflineBanner (הגלובלי, mounted תמיד) להגיב לזה גם הוא, בלי prop drilling
// דרך HomeHeader/HomeComponent/router. כך יש מקור אמת אחד לאייקון "אין
// קליטה" בכל האפליקציה, לא שני רכיבים נפרדים שיכולים להיות לא מסונכרנים.
let fetchIssueActive = false;
const listeners = new Set<(active: boolean) => void>();

export function setFetchIssue(active: boolean): void {
  if (active === fetchIssueActive) return;
  fetchIssueActive = active;
  listeners.forEach(cb => cb(fetchIssueActive));
}

export function subscribeFetchIssue(cb: (active: boolean) => void): () => void {
  listeners.add(cb);
  cb(fetchIssueActive);
  return () => listeners.delete(cb);
}
