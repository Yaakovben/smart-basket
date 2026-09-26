import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { DailyFaithManager } from '../../daily-faith';
import { PriceSyncManager } from '../components/PriceSyncManager';
import { PriceSyncHelpModal } from '../components/PriceSyncHelpModal';
import { DbHealthCard } from '../components/DbHealthCard';
import { AdminAiStatusCard } from '../components/AdminAiStatusCard';
import { PushBroadcastManager } from '../components/PushBroadcastManager';
import { SubscriptionAdminManager } from '../components/SubscriptionAdminManager';
import { FeedbackManager } from '../components/FeedbackManager';
import { useAiStatus } from '../hooks/useAiStatus';
import { useAdminDashboard } from '../hooks/admin-hooks';

// כל אזור בדף המנהל נפתח כעמוד נפרד בכתובת משלו (/admin/<אזור>), במקום
// פופאפ מעל לוח הבקרה. כפתור החזרה מוביל תמיד ללוח הבקרה, גם כשנכנסים
// לעמוד ישירות מקישור.
export type AdminSection = 'faith' | 'price-sync' | 'db' | 'ai' | 'push' | 'subscriptions' | 'feedback';

const AiStatusSection = ({ isDark, onBack }: { isDark: boolean; onBack: () => void }) => {
  const ai = useAiStatus(true);
  return (
    <AdminAiStatusCard
      onClose={onBack}
      isDark={isDark}
      data={ai.data}
      loading={ai.loading}
      refreshing={ai.refreshing}
      lastFetchAt={ai.lastFetchAt}
      refreshError={ai.refreshError}
      onRefresh={ai.forceRefresh}
    />
  );
};

// שליחת הודעה צריכה את רשימת המשתמשים לבחירת נמען
const PushSection = ({ isDark, onBack }: { isDark: boolean; onBack: () => void }) => {
  const { usersWithLoginInfo } = useAdminDashboard();
  return <PushBroadcastManager onClose={onBack} isDark={isDark} users={usersWithLoginInfo} />;
};

export const AdminSectionPage = ({ help = false }: { help?: boolean }) => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const back = () => navigate('/admin');

  if (help) return <PriceSyncHelpModal onClose={() => navigate('/admin/price-sync')} isDark={isDark} />;

  switch (section as AdminSection) {
    case 'faith': return <DailyFaithManager onClose={back} />;
    case 'price-sync': return <PriceSyncManager onClose={back} />;
    case 'db': return <DbHealthCard onClose={back} isDark={isDark} />;
    case 'ai': return <AiStatusSection isDark={isDark} onBack={back} />;
    case 'push': return <PushSection isDark={isDark} onBack={back} />;
    case 'subscriptions': return <SubscriptionAdminManager onClose={back} isDark={isDark} onChanged={() => { /* לוח הבקרה נטען מחדש בחזרה */ }} />;
    case 'feedback': return <FeedbackManager onClose={back} isDark={isDark} />;
    default: return <Navigate to="/admin" replace />;
  }
};
