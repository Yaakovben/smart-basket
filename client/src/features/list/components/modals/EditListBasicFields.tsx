import { memo } from 'react';
import { Box, Typography, Switch } from '@mui/material';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import { ClearableTextField } from '../../../../global/components';
import { COMMON_STYLES, LIST_COLORS } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import type { EditListForm } from '../../types/list-types';

const labelSx = COMMON_STYLES.label;

// ===== תצוגה מקדימה + עריכת שם/אייקון/צבע של רשימה =====
interface EditListBasicFieldsProps {
  editData: EditListForm;
  onUpdateData: (data: EditListForm) => void;
  icons: readonly string[];
}

export const EditListBasicFields = memo(({ editData, onUpdateData, icons }: EditListBasicFieldsProps) => {
  const { t } = useSettings();

  return (
    <>
      {/* Icon Preview */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <Box sx={{
          width: 60,
          height: 60,
          borderRadius: '14px',
          bgcolor: editData.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 4px 12px ${editData.color}40`,
          transition: 'all 0.2s ease'
        }}>
          {editData.icon}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('name')}</Typography>
        <ClearableTextField
          autoFocus
          fullWidth
          value={editData.name}
          onChange={e => onUpdateData({ ...editData, name: e.target.value })}
          onClear={() => onUpdateData({ ...editData, name: '' })}
          size="small"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={labelSx}>{t('icon')}</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }} role="radiogroup" aria-label={t('icon')}>
          {icons.map(i => (
            <Box
              key={i}
              onClick={() => onUpdateData({ ...editData, icon: i })}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: editData.icon === i ? 'primary.main' : 'transparent',
                bgcolor: editData.icon === i ? 'primary.light' : 'action.hover',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.92)' }
              }}
              role="radio"
              aria-checked={editData.icon === i}
              aria-label={i}
            >
              {i}
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={labelSx}>{t('color')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} role="radiogroup" aria-label={t('color')}>
          {LIST_COLORS.map(c => (
            <Box
              key={c}
              onClick={() => onUpdateData({ ...editData, color: c })}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: c,
                cursor: 'pointer',
                border: '3px solid',
                borderColor: editData.color === c ? 'text.primary' : 'transparent',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.9)' }
              }}
              role="radio"
              aria-checked={editData.color === c}
              aria-label={c}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onUpdateData({ ...editData, color: c })}
            />
          ))}
        </Box>
      </Box>

      {/* רשימה קבועה - toggle קליל, לא מודל/מסך נפרד. כשמופעל, "ניקוי רשימה"
          מרמז למשתמש להשתמש באיפוס (ראו ClearListModal) כדי שהמוצרים יחזרו
          מוכנים לפעם הבאה במקום להימחק. */}
      <Box
        onClick={() => onUpdateData({ ...editData, isPermanent: !editData.isPermanent })}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          p: 1.5, mb: 0.5, borderRadius: '14px',
          bgcolor: editData.isPermanent ? 'rgba(139,92,246,0.08)' : 'action.hover',
          border: '1px solid',
          borderColor: editData.isPermanent ? 'rgba(139,92,246,0.25)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <PushPinRoundedIcon sx={{ fontSize: 20, color: editData.isPermanent ? '#8B5CF6' : 'text.secondary', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary' }}>
            {t('permanentList')}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.1 }}>
            {t('permanentListHint')}
          </Typography>
        </Box>
        <Switch checked={editData.isPermanent} onChange={() => onUpdateData({ ...editData, isPermanent: !editData.isPermanent })} onClick={(e) => e.stopPropagation()} size="small" />
      </Box>
    </>
  );
});

EditListBasicFields.displayName = 'EditListBasicFields';
