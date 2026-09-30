import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';
import { useUserRowDetails } from '../hooks/useUserRowDetails';
import { UserRowExpandedContent } from './UserRowExpandedContent';
import { TapToRevealText } from '../../../global/components';
import { ProPill } from './ProPill';
import { proKindOf } from '../helpers/adminDashboardHelpers';
import {
  userRowPaperSx, userRowMainSx, avatarCircleSx, onlineDotSx, lastSeenSx,
  loginCountBoxSx, expandArrowSx,
} from '../styles/UsersTable.styles';

interface UserRowProps {
  user: UserWithLastLogin;
  language: Language;
  isOnline: boolean;
  userActivities: LoginActivity[];
  isDark: boolean;
  onUserDeleted: () => void;
  // מעדכן את רשימת המשתמשים ברמת הדשבורד - בלי זה כרטיס הסטטיסטיקה
  // "X Pro" בכותרת נשאר עם מספר ישן עד לרענון מלא (ראו useAdminDashboard).
  onUserPlanChanged: (userId: string, plan: 'free' | 'pro') => void;
  // מצב הפתיחה מנוהל בטבלה: לחיצה רגילה פותחת לקוח אחד וסוגרת את השאר,
  // לחיצה כפולה פותחת בנוסף לפתוחים (ראו UsersTable)
  isExpanded: boolean;
  onTap: (userId: string, mode: 'single' | 'multi') => void;
}

// שתי לחיצות בתוך הזמן הזה על אותו לקוח הן לחיצה כפולה
const DOUBLE_TAP_MS = 280;

export const UserRow = memo(({ user, language, isOnline, userActivities, isDark, onUserDeleted, onUserPlanChanged, isExpanded, onTap }: UserRowProps) => {
  const { t, settings } = useSettings();
  const { showDetails, userLists, detailsLoading, listsSummary, handleShowDetails } = useUserRowDetails(user.id);
  const isGoogle = user.registrationMethod === 'google';
  const isRtl = settings.language === 'he';

  // plan מקומי - מתעדכן אחרי שינוי מהאדמין בלי refresh כללי,
  // ומסתנכרן עם prop כשהנתונים מתרעננים (pull-to-refresh)
  const [localPlan, setLocalPlan] = useState<'free' | 'pro'>(user.plan ?? 'free');
  useEffect(() => { setLocalPlan(user.plan ?? 'free'); }, [user.plan]);
  // המצב האמיתי: Pro שתוקפו עבר מוצג כחינמי
  const proKind = localPlan === 'pro' ? proKindOf({ ...user, plan: 'pro' }) : null;

  const paperRef = useRef<HTMLDivElement | null>(null);

  // כרטיס שנפתח בתחתית המסך נפתח מתחת לקצה הנראה, ונראה כאילו לא קרה
  // כלום. אחרי אנימציית הפתיחה גוללים כך שהתוכן יהיה גלוי. כרטיס גבוה
  // מהמסך מיושר לראשו, כדי שהשם והפרטים הראשונים לא ייחתכו למעלה.
  const revealCard = useCallback(() => {
    window.setTimeout(() => {
      const el = paperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.visualViewport?.height || window.innerHeight;
      if (rect.top >= 0 && rect.bottom <= viewH) return;
      el.scrollIntoView({ behavior: 'smooth', block: rect.height > viewH * 0.85 ? 'start' : 'nearest' });
    }, 260);
  }, []);

  // לחיצה רגילה מחכה רגע קצר כדי לדעת שלא מגיעה לחיצה שנייה (לחיצה כפולה)
  const lastTapRef = useRef(0);
  const singleTimerRef = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    window.clearTimeout(singleTimerRef.current);
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onTap(user.id, 'multi');
      return;
    }
    lastTapRef.current = now;
    singleTimerRef.current = window.setTimeout(() => onTap(user.id, 'single'), DOUBLE_TAP_MS);
  }, [onTap, user.id]);
  useEffect(() => () => window.clearTimeout(singleTimerRef.current), []);

  // כרטיס שנפתח נגלל לתוך המסך
  useEffect(() => {
    if (isExpanded) revealCard();
  }, [isExpanded, revealCard]);

  // "פרטים נוספים" נפתח רק אחרי שהרשימות נטענו, ואז גוללים אליו
  useEffect(() => {
    if (showDetails && !detailsLoading) revealCard();
  }, [showDetails, detailsLoading, revealCard]);

  const handlePlanChanged = useCallback((userId: string, plan: 'free' | 'pro') => {
    setLocalPlan(plan);
    onUserPlanChanged(userId, plan);
  }, [onUserPlanChanged]);

  const lastActivity = user.lastAppOpenAt && user.lastLoginAt
    ? (new Date(user.lastAppOpenAt) > new Date(user.lastLoginAt) ? user.lastAppOpenAt : user.lastLoginAt)
    : user.lastAppOpenAt || user.lastLoginAt;

  return (
    <Paper ref={paperRef} sx={userRowPaperSx(isOnline, isDark, isRtl)}>
      {/* שורה ראשית */}
      <Box onClick={handleTap} sx={{ ...userRowMainSx(isDark), touchAction: 'manipulation' } as object}>
        {/* אווטאר עם נקודת אונליין */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box sx={avatarCircleSx(user.avatarColor, isOnline, isDark, !!user.avatarEmoji)}>
            {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
          </Box>
          {/* נקודת אונליין על האווטאר */}
          <Box sx={onlineDotSx(isRtl, isOnline, isDark)} />
        </Box>

        {/* שם + נראה לאחרונה */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <TapToRevealText
              text={user.name}
              sx={{ fontSize: 14, fontWeight: 600, color: isDark ? '#F3F4F6' : '#1F2937' }}
            />
            <ProPill kind={proKind} isDark={isDark} />
          </Box>
          <Typography sx={lastSeenSx(isDark)}>
            {lastActivity
              ? getRelativeTime(lastActivity, language)
              : t('neverLoggedIn')
            }
          </Typography>
        </Box>

        {/* מספר כניסות */}
        <Box sx={loginCountBoxSx}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14B8A6', lineHeight: 1 }}>
            {user.totalLogins}
          </Typography>
          <Typography sx={{ fontSize: 8.5, color: '#6B7280', lineHeight: 1.3, fontWeight: 500 }}>
            {t('logins')}
          </Typography>
        </Box>

        {/* חץ הרחבה */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          <ExpandMoreIcon sx={expandArrowSx(isExpanded)} />
        </IconButton>
      </Box>

      {/* אזור מורחב */}
      <Collapse in={isExpanded}>
        <UserRowExpandedContent
          user={{ ...user, plan: localPlan } as UserWithLastLogin}
          language={language}
          isDark={isDark}
          isRtl={isRtl}
          isGoogle={isGoogle}
          userActivities={userActivities}
          showDetails={showDetails}
          userLists={userLists}
          detailsLoading={detailsLoading}
          listsSummary={listsSummary}
          onShowDetails={handleShowDetails}
          onUserDeleted={onUserDeleted}
          onUserPlanChanged={handlePlanChanged}
        />
      </Collapse>
    </Paper>
  );
});

UserRow.displayName = 'UserRow';
