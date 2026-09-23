// אירוע גלובלי שנזרק כשהשרת מחזיר 402 (מגבלת מנוי).
// UpgradeModalContext מאזין לו ופותח את המודל אוטומטית.

export type PlanLimitFeature = 'lists' | 'members' | 'ai' | 'priceComparison';

const EVENT_NAME = 'sb:plan-limit';

export function emitPlanLimit(feature?: PlanLimitFeature) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { feature } }));
}

export function onPlanLimit(handler: (feature?: PlanLimitFeature) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<{ feature?: PlanLimitFeature }>).detail;
    handler(detail?.feature);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
