import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AiAssistantIcon } from '../../../global/components';
import type { AiStatus } from '../../../services/api/admin.api';

interface AdminAiStatusHeaderProps {
  data: AiStatus | null;
  onClose: () => void;
}

// כותרת קבועה (לא גוללת עם התוכן) - אותו דפוס בדיוק כמו DbHealthHeader:
// בלי כפתור רענון ידני ובלי "זמן עדכון" משלה - הרענון נעשה בגרירה
// (pull-to-refresh, ראו AdminAiStatusCard/PullToRefreshIndicator), ו"מתי
// עודכן" מוצג פעם אחת בלבד שם (לא כאן וגם למטה בפאנל הספק - שני חיווי
// זמן שונים לאותו דבר בעצם היו מבלבלים, "אין פעמיים גם למעלה וגם למטה").
export const AdminAiStatusHeader = ({ data, onClose }: AdminAiStatusHeaderProps) => {
  const primary = data?.providers.find(p => p.role === 'primary');

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
        }}>
          <AiAssistantIcon sx={{ color: 'white', fontSize: 16 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>פרטי AI</Typography>
          {data && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.25, flexWrap: 'wrap' }}>
              {primary?.model && (
                <Box sx={{
                  px: 0.7, py: 0.1, borderRadius: 0.75,
                  bgcolor: 'rgba(13,148,136,0.14)', border: '1px solid', borderColor: '#0D9488',
                  maxWidth: 160, overflow: 'hidden',
                }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {primary.model}
                  </Typography>
                </Box>
              )}
              {data.dailyBudget?.exceeded && (
                <Box sx={{
                  px: 0.7, py: 0.1, borderRadius: 0.75,
                  bgcolor: 'rgba(239,68,68,0.14)', border: '1px solid', borderColor: '#EF4444',
                }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
                    מכסה יומית נגמרה
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <IconButton onClick={onClose} aria-label="סגירה">
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
