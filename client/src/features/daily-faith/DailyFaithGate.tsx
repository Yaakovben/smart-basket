import { DailyFaithPopup } from './DailyFaithPopup';
import { useDailyFaith } from './useDailyFaith';

interface DailyFaithGateProps {
  enabled: boolean;
}

export const DailyFaithGate = ({ enabled }: DailyFaithGateProps) => {
  const { quote, dismiss } = useDailyFaith(enabled);

  if (!quote) return null;
  return <DailyFaithPopup text={quote.text} onClose={dismiss} />;
};
