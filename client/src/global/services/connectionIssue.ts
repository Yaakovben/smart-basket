// ערוץ קטן לדיווח על כשל fetch בטעינה הראשונית (רשימות/התראות), בלי
// prop drilling דרך HomeHeader/HomeComponent/router. כרגע רק setFetchIssue
// נקרא בפועל (מ-router/index.tsx) - subscribeFetchIssue זמין לשימוש עתידי
// אם ירצו להציג את זה גם ב-ConnectionStatusIcon הגלובלי.
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
