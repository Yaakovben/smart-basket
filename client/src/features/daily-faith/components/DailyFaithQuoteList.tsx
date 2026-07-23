import { Box, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { ShimmerList } from '../../../global/components/Shimmer';
import { useSettings } from '../../../global/context/SettingsContext';
import { renderFaithText } from '../helpers/formatFaithText';
import { getRelativeTime } from '../../../global/helpers/dateFormatting';
import type { DailyFaith } from '../services/daily-faith.api';
import {
  listScrollBoxSx, sentenceRowSx, sentenceNumberSx, sentenceTextSx, sentenceMetaRowSx,
  sentenceMetaTextSx, sentenceMetaTabularSx, deleteButtonSx,
} from '../styles/DailyFaithManager.styles';

interface DailyFaithQuoteListProps {
  loading: boolean;
  quotes: DailyFaith[];
  search: string;
  isDark: boolean;
  onDeleteRequest: (quote: DailyFaith) => void;
}

// רשימת משפטים — ממלאת את שאר החלל.
// גלילה: momentum חלק ב-iOS, overscrollBehavior:contain מונע bounce של הדף מאחור,
// scrollbar דק ומודרני בדסקטופ, עם פייד עדין למעלה ולמטה שמעיד שיש עוד תוכן.
export const DailyFaithQuoteList = ({ loading, quotes, search, isDark, onDeleteRequest }: DailyFaithQuoteListProps) => {
  const { t, settings } = useSettings();

  return (
    <Box sx={listScrollBoxSx}>
      {loading ? (
        <Box sx={{ py: 1 }}>
          <ShimmerList count={5} rowHeight={62} gap={8} color="#FCD34D" />
        </Box>
      ) : quotes.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography sx={{ fontSize: 36, mb: 1 }}>{search ? '🔍' : '📖'}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 600 }}>
            {search ? 'לא נמצאו תוצאות' : t('dailyFaithEmpty')}
          </Typography>
          {search && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
              נסה מילים אחרות
            </Typography>
          )}
        </Box>
      ) : (
        quotes.map((q, idx) => {
          return (
            <Box key={q.id} sx={sentenceRowSx(isDark)}>
              {/* מספר רץ */}
              <Box sx={sentenceNumberSx(isDark)}>
                {idx + 1}
              </Box>

              {/* תוכן - עם רנדור של bold (*word*) */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={sentenceTextSx}>
                  {renderFaithText(q.text)}
                </Typography>
                {/* תאריך + אורך */}
                <Box sx={sentenceMetaRowSx}>
                  <Typography sx={sentenceMetaTextSx}>
                    {getRelativeTime(q.createdAt, settings.language)}
                  </Typography>
                  <Typography sx={sentenceMetaTextSx}>·</Typography>
                  <Typography sx={sentenceMetaTabularSx}>
                    {q.text.length} תווים
                  </Typography>
                </Box>
              </Box>

              {/* כפתור מחיקה - לחיצה פותחת popup אישור */}
              <IconButton
                size="small"
                onClick={() => onDeleteRequest(q)}
                sx={deleteButtonSx}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })
      )}
    </Box>
  );
};
