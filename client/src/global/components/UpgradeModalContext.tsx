/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { UpgradeModal } from './UpgradeModal';
import { onPlanLimit } from '../helpers/planLimitEvent';

export type PlanLimitFeature = 'lists' | 'members' | 'ai' | 'priceComparison';

interface UpgradeModalContextType {
  showUpgrade: (feature?: PlanLimitFeature) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | null>(null);

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<PlanLimitFeature | undefined>();

  const showUpgrade = useCallback((f?: PlanLimitFeature) => {
    setFeature(f);
    setOpen(true);
  }, []);

  // האזנה לאירועי 402 גלובליים (מ-emitPlanLimit)
  useEffect(() => onPlanLimit(showUpgrade), [showUpgrade]);

  return (
    <UpgradeModalContext.Provider value={{ showUpgrade }}>
      {children}
      <UpgradeModal open={open} onClose={() => setOpen(false)} feature={feature} />
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal(): UpgradeModalContextType {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used inside UpgradeModalProvider');
  return ctx;
}
