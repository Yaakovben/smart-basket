import { useFeatureTips } from './useFeatureTips';
import { FeatureTipsPopup } from './FeatureTipsPopup';

interface Props {
  enabled: boolean;
}

// מציג אוטומטית את קרוסלת הטיפים "ידעת ש...?" כש-useFeatureTips קובע
// שהגיע הזמן (פעם בכמה פתיחות - ראו שם).
export const FeatureTipAutoPopup = ({ enabled }: Props) => {
  const { show, dismiss } = useFeatureTips(enabled);
  if (!show) return null;
  return <FeatureTipsPopup onClose={dismiss} />;
};
