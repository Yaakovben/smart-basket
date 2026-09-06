import { useFeatureTips } from './useFeatureTips';
import { FeatureTipPopup } from './FeatureTipPopup';

interface Props {
  enabled: boolean;
}

// מציג אוטומטית טיפ "ידעת ש...?" כש-useFeatureTips קובע שהגיע הזמן.
export const FeatureTipAutoPopup = ({ enabled }: Props) => {
  const { tip, dismiss } = useFeatureTips(enabled);
  if (!tip) return null;
  return <FeatureTipPopup tip={tip} onClose={dismiss} />;
};
