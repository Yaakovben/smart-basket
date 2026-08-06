import { useState } from 'react';
import { Box, Typography, CircularProgress, Collapse, Skeleton, TextField, Button } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GroupIcon from '@mui/icons-material/Group';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, getRelativeTime } from '../../../global/helpers';
import { adminApi, type AdminUserList } from '../../../services/api';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';
import { EVENT_COLORS } from '../helpers/usersTableHelpers';
import { UserListCard } from './UserListCard';
import { UserMethodBadge } from './UserMethodBadge';
import {
  eventCardSx, eventHeaderSx, eventTitleSx, eventBodySx, eventDateSx,
  detailsButtonSx, expandArrowSx, listsSummaryLabelSx,
  timelineContainerSx, timelineLineSx, timelineRowSx, timelineDotSx,
} from '../styles/UsersTable.styles';

interface UserRowExpandedContentProps {
  user: UserWithLastLogin;
  language: Language;
  isDark: boolean;
  isRtl: boolean;
  isGoogle: boolean;
  userActivities: LoginActivity[];
  showDetails: boolean;
  userLists: AdminUserList[] | null;
  detailsLoading: boolean;
  listsSummary: { total: number; totalProducts: number; groups: number } | null;
  onShowDetails: () => void;
  onUserDeleted: () => void;
}

// תוכן האזור המורחב בשורת משתמש: אירועי רישום/כניסה אחרונה, רשימות המשתמש וציר זמן פעילות
export const UserRowExpandedContent = ({
  user, language, isDark, isRtl, isGoogle, userActivities,
  showDetails, userLists, detailsLoading, listsSummary, onShowDetails, onUserDeleted,
}: UserRowExpandedContentProps) => {
  const { t } = useSettings();
  // מחיקת משתמש - בכוונה לא-נגיש: קישור מוצנע בתחתית האזור המורחב (לא כפתור
  // בשורה הראשית), פותח אישור שדורש הקלדת השם המדויק לפני שהכפתור בכלל נהיה
  // פעיל. פעולה בלתי הפיכה (מוחקת רשימות פרטיות, קבוצות בבעלות, וכו') -
  // ראו deleteAccount ב-user.service.ts בצד השרת.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(false);
    try {
      await adminApi.deleteUser(user.id);
      onUserDeleted();
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ px: 1.5, pb: 2, pt: 0.5 }}>

      {/* 1. רישום - סגול */}
      <Box sx={eventCardSx(EVENT_COLORS.registration)}>
        <Box sx={eventHeaderSx(EVENT_COLORS.registration)}>
          <PersonAddIcon sx={{ fontSize: 15, color: EVENT_COLORS.registration }} />
          <Typography sx={eventTitleSx(EVENT_COLORS.registration)}>
            {t('registeredAt')}
          </Typography>
        </Box>
        <Box sx={eventBodySx}>
          <Typography sx={eventDateSx(isDark)}>
            {formatDateShort(user.createdAt, language)} · {formatTimeShort(user.createdAt, language)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            {isGoogle
              ? <GoogleIcon sx={{ fontSize: 13, color: EVENT_COLORS.google }} />
              : <EmailIcon sx={{ fontSize: 13, color: EVENT_COLORS.login }} />
            }
            <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
              {isGoogle ? t('methodGoogle') : t('methodEmail')}
            </Typography>
            <Typography sx={{ mx: 0.5, color: '#D1D5DB' }}>·</Typography>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF', wordBreak: 'break-all' }}>
              {user.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 2. פתיחת אפליקציה אחרונה - כחול */}
      <Box sx={{ ...eventCardSx(EVENT_COLORS.app_open), mb: 1.5 }}>
        <Box sx={eventHeaderSx(EVENT_COLORS.app_open)}>
          <PhoneAndroidIcon sx={{ fontSize: 15, color: EVENT_COLORS.app_open }} />
          <Typography sx={eventTitleSx(EVENT_COLORS.app_open)}>
            {t('lastAppOpen')}
          </Typography>
        </Box>
        <Box sx={eventBodySx}>
          {user.lastAppOpenAt ? (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#D1D5DB' : '#374151' }}>
                {getRelativeTime(user.lastAppOpenAt, language)}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', mt: 0.25 }}>
                {formatDateShort(user.lastAppOpenAt, language)} · {formatTimeShort(user.lastAppOpenAt, language)}
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' }}>
              {t('neverOpened')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* כפתור פרטים נוספים */}
      <Box
        onClick={onShowDetails}
        sx={{ ...detailsButtonSx(showDetails, isDark), mb: userActivities.length > 0 ? 1.5 : 0 }}
      >
        {detailsLoading ? (
          <CircularProgress size={14} sx={{ color: '#14B8A6' }} />
        ) : (
          <InfoOutlinedIcon sx={{ fontSize: 15, color: '#14B8A6' }} />
        )}
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#14B8A6' }}>
          {t('moreDetails')}
        </Typography>
        <ExpandMoreIcon sx={expandArrowSx(showDetails)} />
      </Box>

      {/* פרטים מורחבים: רשימות + מוצרים */}
      <Collapse in={showDetails}>
        <Box sx={{ mt: 1 }}>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rounded" height={48} sx={{ borderRadius: '10px' }} />
              ))}
            </Box>
          ) : userLists && userLists.length > 0 ? (
            <>
              {/* סיכום */}
              {listsSummary && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ListAltIcon sx={{ fontSize: 13, color: '#14B8A6' }} />
                    <Typography sx={listsSummaryLabelSx(isDark)}>
                      {listsSummary.total} {t('lists')}
                    </Typography>
                  </Box>
                  {listsSummary.groups > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <GroupIcon sx={{ fontSize: 13, color: '#8B5CF6' }} />
                      <Typography sx={listsSummaryLabelSx(isDark)}>
                        {listsSummary.groups} {t('groups')}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ShoppingCartIcon sx={{ fontSize: 13, color: '#3B82F6' }} />
                    <Typography sx={listsSummaryLabelSx(isDark)}>
                      {listsSummary.totalProducts} {t('products')}
                    </Typography>
                  </Box>
                </Box>
              )}
              {/* רשימת הרשימות */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {userLists.map(list => (
                  <UserListCard key={list.id} list={list} isDark={isDark} />
                ))}
              </Box>
            </>
          ) : (
            <Typography sx={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', py: 1, fontStyle: 'italic' }}>
              {t('noLists')}
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* ציר זמן פעילות */}
      {userActivities.length > 0 && (
        <Box sx={{ mt: showDetails ? 1.5 : 0 }}>
          <Typography sx={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('recentActivity')}
          </Typography>
          <Box sx={timelineContainerSx(isRtl)}>
            {/* קו ציר זמן */}
            <Box sx={timelineLineSx(isRtl, isDark)} />
            {userActivities.slice(0, 8).map((activity) => {
              const dotColor = activity.loginMethod === 'app_open'
                ? EVENT_COLORS.app_open
                : activity.loginMethod === 'google'
                  ? EVENT_COLORS.google
                  : EVENT_COLORS.login;
              return (
                <Box key={activity.id} sx={timelineRowSx}>
                  {/* נקודת ציר זמן */}
                  <Box sx={timelineDotSx(isRtl, dotColor, isDark)} />
                  <Typography sx={{ fontSize: 11, color: '#9CA3AF', minWidth: 38 }}>
                    {formatTimeShort(activity.timestamp, language)}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#6B7280', minWidth: 62 }}>
                    {formatDateShort(activity.timestamp, language)}
                  </Typography>
                  <UserMethodBadge method={activity.loginMethod} size={22} />
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* מחיקת משתמש - קישור מוצנע, לא כפתור בולט. פעולה נדירה ומכוונת בלבד. */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
        {!confirmingDelete ? (
          <Typography
            onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
            sx={{ fontSize: 10.5, color: isDark ? '#4B5563' : '#D1D5DB', cursor: 'pointer', textAlign: 'center', '&:hover': { color: '#EF4444' } }}
          >
            מחיקת משתמש
          </Typography>
        ) : (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontSize: 11.5, color: '#EF4444', fontWeight: 600, lineHeight: 1.5 }}>
              פעולה בלתי הפיכה - מוחקת לצמיתות את כל הרשימות הפרטיות, הקבוצות בבעלות {user.name} (או מעבירה בעלות לחבר אחר אם יש), ואת כל הנתונים שלו/ה. כדי לאשר, הקלד/י את השם המדויק: {user.name}
            </Typography>
            <TextField
              size="small"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={user.name}
              disabled={deleting}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
            />
            {deleteError && (
              <Typography sx={{ fontSize: 11, color: '#EF4444' }}>המחיקה נכשלה - נסה שוב</Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                size="small"
                variant="contained"
                color="error"
                disabled={confirmText !== user.name || deleting}
                onClick={handleDelete}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                {deleting ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'מחק לצמיתות'}
              </Button>
              <Button
                fullWidth
                size="small"
                variant="text"
                disabled={deleting}
                onClick={() => { setConfirmingDelete(false); setConfirmText(''); setDeleteError(false); }}
                sx={{ borderRadius: '10px', textTransform: 'none' }}
              >
                ביטול
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
