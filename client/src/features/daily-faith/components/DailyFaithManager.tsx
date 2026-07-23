import { Box, Typography, TextField, IconButton, InputAdornment, Collapse } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ClearIcon from '@mui/icons-material/Close';
import { Modal } from '../../../global/components/Modal';
import { ConfirmModal } from '../../../global/components/ConfirmModal';
import { useSettings } from '../../../global/context/SettingsContext';
import { useDailyFaithManager } from '../hooks/useDailyFaithManager';
import { DailyFaithAddCard } from './DailyFaithAddCard';
import { DailyFaithQuoteList } from './DailyFaithQuoteList';
import {
  goldFieldSx, modalBodySx, statsRowSx, statsBadgeSx, searchToggleBtnSx,
} from '../styles/DailyFaithManager.styles';

interface Props {
  onClose: () => void;
}

export const DailyFaithManager = ({ onClose }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const {
    quotes, text, setText, loading, saving, search, setSearch, searchOpen, setSearchOpen,
    quoteToDelete, setQuoteToDelete, duplicateCandidate, setDuplicateCandidate,
    showFormatTip, setShowFormatTip,
    filteredQuotes, handleAdd, handleDelete, confirmDuplicateAdd,
  } = useDailyFaithManager();

  return (
    <Modal title={t('dailyFaithManagerTitle')} onClose={onClose}>
      {/* גובה קבוע — גם ברשימה ריקה וגם מלאה. מונע "קפיצה" של ה-popup */}
      <Box sx={modalBodySx}>

        {/* שורת סטטיסטיקה + כפתור חיפוש (רק כשיש מספיק משפטים) */}
        <Box sx={statsRowSx}>
          <Box sx={statsBadgeSx(isDark)}>
            <AutoStoriesIcon sx={{ fontSize: 14, color: '#8B6914' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#8B6914', letterSpacing: 0.3 }}>
              {quotes.length} {quotes.length === 1 ? 'משפט' : 'משפטים'}
            </Typography>
          </Box>
          {search && filteredQuotes.length !== quotes.length && (
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              · מציג {filteredQuotes.length}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {/* כפתור חיפוש - מופיע רק כשיש מספיק משפטים להצדיק זה */}
          {quotes.length > 3 && (
            <IconButton
              size="small"
              onClick={() => {
                const next = !searchOpen;
                setSearchOpen(next);
                if (!next) setSearch(''); // סגירה - מנקה גם את תוצאות הסינון
              }}
              sx={searchToggleBtnSx(searchOpen, isDark)}
              aria-label="חיפוש"
            >
              <SearchIcon sx={{ fontSize: 17 }} />
            </IconButton>
          )}
        </Box>

        <DailyFaithAddCard
          text={text}
          onTextChange={setText}
          saving={saving}
          onAdd={handleAdd}
          showFormatTip={showFormatTip}
          onToggleFormatTip={() => setShowFormatTip(v => !v)}
          isDark={isDark}
        />

        {/* חיפוש מתקפל - פתוח רק כשלוחצים על כפתור החיפוש */}
        <Collapse in={searchOpen && quotes.length > 3} unmountOnExit>
          <Box sx={{ flexShrink: 0, pt: 0.25 }}>
            <TextField
              fullWidth
              autoFocus
              size="small"
              placeholder="חיפוש משפט..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#8B6914', opacity: 0.7 }} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.5 }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={goldFieldSx}
            />
          </Box>
        </Collapse>

        <DailyFaithQuoteList
          loading={loading}
          quotes={filteredQuotes}
          search={search}
          isDark={isDark}
          onDeleteRequest={setQuoteToDelete}
        />
      </Box>

      {/* POPUP אישור מחיקה - מוצג רק כשנבחר משפט למחיקה */}
      {quoteToDelete && (
        <ConfirmModal
          title="מחיקת משפט"
          message={`האם למחוק את המשפט? פעולה זו לא ניתנת לביטול.\n\n"${quoteToDelete.text.slice(0, 120)}${quoteToDelete.text.length > 120 ? '…' : ''}"`}
          confirmText="מחק"
          onConfirm={() => handleDelete(quoteToDelete.id)}
          onCancel={() => setQuoteToDelete(null)}
        />
      )}

      {/* POPUP אזהרת כפילות - מופיע כשמנסים להוסיף משפט שכבר קיים */}
      {duplicateCandidate && (
        <ConfirmModal
          title="המשפט כבר קיים"
          message={`משפט זהה נמצא כבר ברשימה:\n\n"${duplicateCandidate.existing.text.slice(0, 150)}${duplicateCandidate.existing.text.length > 150 ? '…' : ''}"\n\nלהוסיף בכל זאת?`}
          confirmText="הוסף בכל זאת"
          onConfirm={confirmDuplicateAdd}
          onCancel={() => setDuplicateCandidate(null)}
        />
      )}
    </Modal>
  );
};
