import { DailyFaithPopup } from './DailyFaithPopup';
import { useDailyFaith } from '../hooks/useDailyFaith';

interface DailyFaithAutoPopupProps {
  enabled: boolean;
}

// מציג אוטומטית את הפופאפ היומי כשיש משפט זמין (useDailyFaith קובע מתי).
export const DailyFaithAutoPopup = ({ enabled }: DailyFaithAutoPopupProps) => {
  const { quote, dismiss } = useDailyFaith(enabled);

  if (!quote) return null;
  return <DailyFaithPopup text={quote.text} onClose={dismiss} />;
};
