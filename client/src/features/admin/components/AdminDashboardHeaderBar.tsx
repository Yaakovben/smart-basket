import { Box, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StorageIcon from '@mui/icons-material/Storage';
import CampaignIcon from '@mui/icons-material/Campaign';
import RefreshIcon from '@mui/icons-material/Refresh';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import { headerIconButtonSx } from '../styles/AdminDashboard.styles';
import { AiAssistantIcon } from '../../../global/components';
import type { AiStatus } from '../../../services/api/admin.api';
import { getAiHealth, AI_HEALTH_LABEL } from '../helpers/aiStatusHelpers';
import { SubscriptionHeaderIcon } from './SubscriptionHeaderIcon';

interface AdminDashboardHeaderBarProps {
  isRtl: boolean;
  title: string;
  faithTitle: string;
  onBack: () => void;
  onOpenDbHealth: () => void;
  onOpenFaith: () => void;
  onOpenPriceSync: () => void;
  onOpenAiStatus: () => void;
  aiStatus: AiStatus | null;
  onOpenPush: () => void;
  onOpenSubscriptions: () => void;
  onOpenFeedback: () => void;
  onRefresh: () => void;
}

// כותרת עליונה: שורת חזרה+כותרת, ומתחתיה שורת כפתורי כלים נפרדת (מקום
// מלא לכל האייקונים). סדר ה-DOM בשורת האייקונים = סדר ויזואלי מימין
// לשמאל (ראו הערה למטה) - שליחת הודעות תמיד הכי ימני, ואייקון ה-AI
// תמיד מיד לפניו (משמאלו). הרענון העיקרי הוא בגרירה (pull-to-refresh,
// ראו AdminDashboard/PullToRefreshIndicator), ויש גם כפתור רענון ידני
// לדסקטופ (ראו RefreshIcon למטה).
export const AdminDashboardHeaderBar = ({
  isRtl, title, faithTitle,
  onBack, onOpenDbHealth, onOpenFaith, onOpenPriceSync, onOpenAiStatus, aiStatus, onOpenPush, onOpenSubscriptions, onOpenFeedback, onRefresh,
}: AdminDashboardHeaderBarProps) => {
  const aiHealth = getAiHealth(aiStatus);
  return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3, position: 'relative', zIndex: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box onClick={onBack} role="button" tabIndex={0} sx={headerIconButtonSx(36)}>
        {isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
      </Box>
      <Typography sx={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
        {title}
      </Typography>
    </Box>
    {/* שורה נפרדת מתחת לכותרת - במקום לחלוק איתה שורה אחת, כדי שיהיה
        מקום מלא לכל האייקונים (במיוחד אחרי הוספת אייקון המשוב) בלי
        להיחתך/להידחס במסך צר. flexWrap כרשת ביטחון אם עדיין אין מספיק
        רוחב (למשל טאבלט צר עם פונט גדול). */}
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap',
    }}>
      {/* ראשון ב-DOM = ימני קיצוני ב-RTL: שליחת הודעות תמיד הכי ימני,
          ומיד אחריו (משמאלו) אייקון פרטי ה-AI */}
      <Box onClick={onOpenPush} role="button" tabIndex={0} aria-label="שליחת הודעות למשתמשים" sx={headerIconButtonSx(44)}>
        <CampaignIcon sx={{ fontSize: 26 }} />
      </Box>
      <SubscriptionHeaderIcon onClick={onOpenSubscriptions} />
      <Box onClick={onOpenFeedback} role="button" tabIndex={0} aria-label="משובי משתמשים" sx={headerIconButtonSx(44)}>
        <RateReviewRoundedIcon sx={{ fontSize: 26 }} />
      </Box>
      {/* אותו אייקון AI כמו בכל האפליקציה (כוכבי-נצנוץ), לבן, באותו גודל
          וסגנון בדיוק כמו שאר אייקוני הכותרת - בלי כיתוב/פריסה שונה שהיה
          שובר את האחידות של השורה. בלי חיווי צבע על האייקון עצמו, כי
          הסטטוס כבר מוצג בפירוט בפאנל שנפתח בלחיצה. */}
      <Box
        onClick={onOpenAiStatus} role="button" tabIndex={0}
        aria-label={`פרטי AI - ${AI_HEALTH_LABEL[aiHealth]}`}
        sx={headerIconButtonSx(44)}
      >
        <AiAssistantIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onOpenDbHealth} role="button" tabIndex={0} aria-label="שימוש ב-MongoDB" sx={headerIconButtonSx(44)}>
        <StorageIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onOpenFaith} role="button" tabIndex={0} aria-label={faithTitle} sx={headerIconButtonSx(44)}>
        <AutoStoriesIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onOpenPriceSync} role="button" tabIndex={0} aria-label="ניהול מאגר מחירים" sx={headerIconButtonSx(44)}>
        <StorefrontIcon sx={{ fontSize: 26 }} />
      </Box>
      {/* כפתור רענון ידני — מיועד לשימוש מדסקטופ שאין לו touch events */}
      <Box onClick={onRefresh} role="button" tabIndex={0} aria-label="רענן נתונים" sx={{ ...headerIconButtonSx(44), display: { xs: 'none', md: 'flex' } }}>
        <RefreshIcon sx={{ fontSize: 26 }} />
      </Box>
    </Box>
  </Box>
  );
};
