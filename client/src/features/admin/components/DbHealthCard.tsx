import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import DescriptionIcon from '@mui/icons-material/Description';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import PeopleIcon from '@mui/icons-material/People';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LoginIcon from '@mui/icons-material/Login';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { adminApi, type DbHealth, type DbHealthCollection } from '../../../services/api/admin.api';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

// תרגומי קולקציות לעברית + אייקון - תצוגה יותר ידידותית.
const COLLECTION_META: Record<string, { he: string; icon: React.ComponentType<{ sx?: object }>; color: string }> = {
  prices: { he: 'מחירים', icon: LocalGroceryStoreIcon, color: '#0D9488' },
  branches: { he: 'סניפים', icon: StorefrontIcon, color: '#14B8A6' },
  users: { he: 'משתמשים', icon: PeopleIcon, color: '#3B82F6' },
  lists: { he: 'רשימות קניות', icon: ListAltIcon, color: '#8B5CF6' },
  products: { he: 'מוצרים ברשימות', icon: DescriptionIcon, color: '#A78BFA' },
  notifications: { he: 'התראות', icon: NotificationsIcon, color: '#F59E0B' },
  loginactivities: { he: 'פעילות התחברות', icon: LoginIcon, color: '#6366F1' },
  dailyfaiths: { he: 'חיזוק יומי', icon: MenuBookIcon, color: '#EC4899' },
};
const collectionMeta = (name: string) => COLLECTION_META[name] || { he: name, icon: DescriptionIcon, color: '#94A3B8' };

const formatMB = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

interface StatusInfo {
  color: string; bg: string; icon: React.ComponentType<{ sx?: object }>;
  title: string; subtitle: string;
}
const statusInfo = (status: 'ok' | 'warning' | 'critical', isDark: boolean): StatusInfo => {
  if (status === 'critical') return {
    color: '#DC2626', bg: isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2',
    icon: ErrorIcon, title: 'מצב קריטי', subtitle: 'יש לפעול בהקדם — שדרוג Plan או הקטנת TTL',
  };
  if (status === 'warning') return {
    color: '#D97706', bg: isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7',
    icon: WarningAmberIcon, title: 'צריך לעקוב', subtitle: 'הניצול גבוה — מומלץ לבדוק שוב בעוד יום-יומיים',
  };
  return {
    color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
    icon: CheckCircleIcon, title: 'הכל תקין', subtitle: 'יש מספיק מקום פנוי — אין מה לעשות',
  };
};

// כפתור עיגולי גדול שמראה אחוז ניצול - הכי ויזואלי שיש.
const CircularGauge = ({ percent, color, isDark }: { percent: number; color: string; isDark: boolean }) => {
  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>
          {percent.toFixed(1)}
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.secondary', mt: 0.5 }}>
          % בשימוש
        </Typography>
      </Box>
    </Box>
  );
};

// בר אופקי ארוך שמראה את כל הקולקציות יחד באותו פס - הכי ויזואלי לפרופורציות.
const StackedBar = ({ collections, totalSize }: { collections: DbHealthCollection[]; totalSize: number }) => (
  <Box sx={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
    {collections.map((c) => {
      const collTotal = c.storageSize + c.indexSize;
      const pct = (collTotal / totalSize) * 100;
      const meta = collectionMeta(c.name);
      return (
        <Box
          key={c.name}
          title={`${meta.he}: ${formatMB(collTotal)}`}
          sx={{ width: `${pct}%`, bgcolor: meta.color }}
        />
      );
    })}
  </Box>
);

export const DbHealthCard = ({ isDark, onClose }: Props) => {
  const [data, setData] = useState<DbHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getDbHealth();
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const status = data ? statusInfo(data.status, isDark) : null;
  const StatusIcon = status?.icon;
  const totalDocs = data ? data.collections.reduce((s, c) => s + c.documents, 0) : 0;
  const freeBytes = data ? Math.max(0, data.limitMB * 1024 * 1024 - data.totalSize) : 0;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? '#0F172A' : '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#0D9488' }} />
          <Typography sx={{ fontSize: 18, fontWeight: 800 }}>שימוש במאגר</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={load} disabled={loading} aria-label="רענון">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onClose} aria-label="סגירה">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {data && status && StatusIcon && (
          <>
            {/* Hero card עם גאוג' גדול */}
            <Box sx={{
              p: 3, borderRadius: 3, mb: 2, textAlign: 'center',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
              border: '1px solid', borderColor: 'divider',
            }}>
              <CircularGauge percent={data.usedPct} color={status.color} isDark={isDark} />
              <Box sx={{
                mt: 2, p: 1.5, borderRadius: 2,
                bgcolor: status.bg,
                display: 'inline-flex', alignItems: 'center', gap: 1,
              }}>
                <StatusIcon sx={{ color: status.color, fontSize: 22 }} />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.2 }}>
                    {status.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: status.color, opacity: 0.85, lineHeight: 1.2 }}>
                    {status.subtitle}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 3 מספרים גדולים לסקירה מהירה */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Box sx={{
                flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
                bgcolor: isDark ? 'rgba(20,184,166,0.12)' : '#CCFBF1',
              }}>
                <Typography sx={{ fontSize: 10, color: '#0D9488', fontWeight: 800, letterSpacing: 0.3 }}>
                  בשימוש
                </Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0D9488', lineHeight: 1.1 }}>
                  {formatMB(data.totalSize)}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: '#0D9488', opacity: 0.75, mt: 0.25 }}>
                  {data.usedPct}%
                </Typography>
              </Box>
              <Box sx={{
                flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
                bgcolor: isDark ? 'rgba(59,130,246,0.12)' : '#DBEAFE',
              }}>
                <Typography sx={{ fontSize: 10, color: '#1D4ED8', fontWeight: 800, letterSpacing: 0.3 }}>
                  פנוי
                </Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#1D4ED8', lineHeight: 1.1 }}>
                  {formatMB(freeBytes)}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: '#1D4ED8', opacity: 0.75, mt: 0.25 }}>
                  {(100 - data.usedPct).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{
                flex: 1, p: 1.5, borderRadius: 2, textAlign: 'center',
                bgcolor: isDark ? 'rgba(139,92,246,0.12)' : '#EDE9FE',
              }}>
                <Typography sx={{ fontSize: 10, color: '#6D28D9', fontWeight: 800, letterSpacing: 0.3 }}>
                  סך מסמכים
                </Typography>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#6D28D9', lineHeight: 1.1 }}>
                  {totalDocs >= 10000 ? `${(totalDocs / 1000).toFixed(0)}K` : totalDocs.toLocaleString('he-IL')}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: '#6D28D9', opacity: 0.75, mt: 0.25 }}>
                  ב-{data.collectionCount} קולקציות
                </Typography>
              </Box>
            </Box>

            {/* סיכום כללי - שקיפות מלאה ל-Free Tier */}
            <Box sx={{
              p: 2, borderRadius: 2, mb: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
              border: '1px solid', borderColor: 'divider',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1.5, letterSpacing: 0.3 }}>
                סיכום כולל
              </Typography>

              {/* בר תלת-חלקי: נתונים | אינדקסים | פנוי */}
              {(() => {
                const limitBytes = data.limitMB * 1024 * 1024;
                const dataPct = (data.storageSize / limitBytes) * 100;
                const indexPct = (data.indexSize / limitBytes) * 100;
                const freePct = Math.max(0, 100 - dataPct - indexPct);
                return (
                  <>
                    <Box sx={{ display: 'flex', height: 28, borderRadius: 2, overflow: 'hidden', mb: 1 }}>
                      <Box sx={{ width: `${dataPct}%`, bgcolor: '#0D9488' }} title={`נתונים: ${formatMB(data.storageSize)}`} />
                      <Box sx={{ width: `${indexPct}%`, bgcolor: '#F59E0B' }} title={`אינדקסים: ${formatMB(data.indexSize)}`} />
                      <Box sx={{ width: `${freePct}%`, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }} title={`פנוי: ${formatMB(freeBytes)}`} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0D9488' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>נתונים {dataPct.toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>אינדקסים {indexPct.toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>פנוי {freePct.toFixed(1)}%</Typography>
                      </Box>
                    </Box>
                  </>
                );
              })()}

              {/* שורת מידע על ה-Tier */}
              <Box sx={{
                mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider',
                fontSize: 11, color: 'text.secondary', lineHeight: 1.5,
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  💡 מה זה אומר?
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  • <b>Atlas Free Tier</b> נותן {data.limitMB}MB סה״כ (נתונים+אינדקסים).
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  • כשמגיעים ל-90%+ MongoDB מתחיל לחסום כתיבות חדשות.
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  • TTL ב-prices מוחק רשומות מעל 14 ימים אוטומטית.
                </Typography>
                {data.usedPct > 70 && (
                  <Typography sx={{ fontSize: 11, color: '#D97706', fontWeight: 700, mt: 0.5 }}>
                    ⚠️ אם נמשיך לגדול - שדרוג ל-M2 (2GB, $9/חודש) או M5 (5GB, $25/חודש).
                  </Typography>
                )}
              </Box>
            </Box>

            {/* בר ויזואלי שמראה את כל הקולקציות יחד */}
            <Box sx={{
              p: 2, borderRadius: 2, mb: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
              border: '1px solid', borderColor: 'divider',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1, letterSpacing: 0.3 }}>
                התפלגות קולקציות
              </Typography>
              <StackedBar collections={data.collections} totalSize={data.totalSize} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {data.collections.map(c => {
                  const meta = collectionMeta(c.name);
                  return (
                    <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.color }} />
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{meta.he}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* רשימת קולקציות מפורטת */}
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.disabled', mb: 1, letterSpacing: 0.3 }}>
              פירוט מלא ({data.collections.length} קולקציות)
            </Typography>
            {data.collections.map((c) => {
              const meta = collectionMeta(c.name);
              const Icon = meta.icon;
              const collTotal = c.storageSize + c.indexSize;
              const collPct = (collTotal / data.totalSize) * 100;
              return (
                <Box key={c.name} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  mb: 1, p: 1.5, borderRadius: 2,
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '50%',
                    bgcolor: meta.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon sx={{ color: meta.color, fontSize: 22 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{meta.he}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: meta.color, fontVariantNumeric: 'tabular-nums' }}>
                        {formatMB(collTotal)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                        {c.documents.toLocaleString('he-IL')} מסמכים
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>
                        {collPct.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{
                      height: 4, borderRadius: 2, mt: 0.5, overflow: 'hidden',
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }}>
                      <Box sx={{
                        width: `${Math.min(100, collPct)}%`,
                        height: '100%',
                        bgcolor: meta.color,
                        transition: 'width 0.4s ease',
                      }} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </>
        )}
      </Box>
    </Box>
  );
};
