import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { ClearableTextField, IconTile } from '../../../../global/components';
import { COMMON_STYLES, LIST_COLORS } from '../../../../global/helpers';
import { getIconGradient } from '../../../../global/theme/iconArt';
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
        <IconTile emoji={editData.icon} color={editData.color} seedId={`${editData.icon}${editData.color}`} size={60} fontSize={28} />
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
                background: getIconGradient(c),
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
    </>
  );
});

EditListBasicFields.displayName = 'EditListBasicFields';
