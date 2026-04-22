import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, TextField, Button, IconButton, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { Modal } from '../../global/components/Modal';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { dailyFaithApi, type DailyFaith } from './daily-faith.api';

interface Props {
  onClose: () => void;
}

export const DailyFaithManager = ({ onClose }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [quotes, setQuotes] = useState<DailyFaith[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dailyFaithApi.getAll();
      setQuotes(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    try {
      setSaving(true);
      haptic('light');
      const newQuote = await dailyFaithApi.create(trimmed);
      setQuotes((prev) => [newQuote, ...prev]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    haptic('light');
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    try {
      await dailyFaithApi.remove(id);
    } catch {
      load();
    }
  };

  return (
    <Modal title={t('dailyFaithManagerTitle')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            size="small"
            placeholder={t('dailyFaithPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={saving || text.trim().length < 2}
            sx={{ minWidth: 44, height: 44, borderRadius: '12px', p: 0 }}
          >
            <AddIcon />
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '50vh', overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : quotes.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 3, fontSize: 14 }}>
              {t('dailyFaithEmpty')}
            </Typography>
          ) : (
            quotes.map((q) => (
              <Box
                key={q.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ flex: 1, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {q.text}
                </Typography>
                <IconButton size="small" onClick={() => handleDelete(q.id)} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Modal>
  );
};
