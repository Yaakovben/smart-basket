import { useState, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import type { List, ToastType } from '../../../global/types';
import { listsApi } from '../../../services/api';
import { haptic } from '../../../global/helpers';
import { ConfirmModal } from '../../../global/components';
import { convertApiList } from '../../../global/hooks/converters';

interface TemplatesSectionProps {
  templates: List[];
  isDark: boolean;
  onApply: (newList: List) => void;
  onDelete: (templateId: string) => void;
  showToast: (message: string, type?: ToastType) => void;
}

interface TemplateBottomSheetProps {
  template: List;
  isDark: boolean;
  onClose: () => void;
  onApply: (newList: List) => void;
  onDelete: (templateId: string) => void;
  showToast: (message: string, type?: ToastType) => void;
}

// ===== Bottom Sheet של תבנית =====
const TemplateBottomSheet = ({ template, isDark, onClose, onApply, onDelete, showToast }: TemplateBottomSheetProps) => {
  const [applying, setApplying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleApply = async () => {
    haptic('medium');
    setApplying(true);
    try {
      const apiList = await listsApi.applyTemplate(template.id);
      const newList = convertApiList(apiList);
      showToast('רשימה חדשה נוצרה מהתבנית ✅', 'success');
      onApply(newList);
      onClose();
    } catch {
      showToast('שגיאה ביצירת הרשימה', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async () => {
    try {
      await listsApi.deleteTemplate(template.id);
      onDelete(template.id);
      showToast('התבנית נמחקה', 'success');
      onClose();
    } catch {
      showToast('שגיאה במחיקת התבנית', 'error');
    }
  };

  const productCount = template.products?.length ?? 0;

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0, zIndex: 1300,
          bgcolor: 'rgba(0,0,0,0.45)',
          animation: 'fadeIn 0.2s ease',
          '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
        }}
      />
      {/* Sheet */}
      <Box sx={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 500,
        zIndex: 1301,
        bgcolor: 'background.paper',
        borderRadius: '20px 20px 0 0',
        p: 3, pb: 'calc(24px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        '@keyframes slideUp': { from: { transform: 'translateX(-50%) translateY(100%)' }, to: { transform: 'translateX(-50%) translateY(0)' } },
      }}>
        {/* סגירה */}
        <Box
          onClick={onClose}
          sx={{
            position: 'absolute', top: 12, left: 16,
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <CloseIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Box>

        {/* אייקון + שם */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2.5, mt: 0.5 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '18px',
            bgcolor: template.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
            boxShadow: `0 6px 20px ${template.color}50`,
            mb: 1.5,
          }}>
            {template.icon}
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
            {template.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StarIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {productCount > 0 ? `${productCount} פריטים בתבנית` : 'תבנית ריקה'}
            </Typography>
          </Box>
        </Box>

        {/* כפתור יצירת רשימה */}
        <Box
          onClick={applying ? undefined : handleApply}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            bgcolor: '#14B8A6',
            borderRadius: '14px',
            py: 1.6,
            cursor: applying ? 'default' : 'pointer',
            opacity: applying ? 0.7 : 1,
            transition: 'all 0.15s ease',
            mb: 1.5,
            '&:active': { transform: 'scale(0.97)' },
            boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
          }}
        >
          {applying
            ? <CircularProgress size={20} sx={{ color: 'white' }} />
            : <AddIcon sx={{ color: 'white', fontSize: 20 }} />
          }
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
            {applying ? 'יוצר רשימה…' : 'צור רשימה מהתבנית'}
          </Typography>
        </Box>

        {/* כפתור מחיקה */}
        <Box
          onClick={() => { haptic('light'); setConfirmDelete(true); }}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
            py: 1, cursor: 'pointer', borderRadius: '12px',
            '&:active': { opacity: 0.7 },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 17, color: 'error.main' }} />
          <Typography sx={{ fontSize: 13.5, color: 'error.main', fontWeight: 600 }}>
            מחק תבנית
          </Typography>
        </Box>
      </Box>

      {confirmDelete && (
        <ConfirmModal
          title="מחיקת תבנית"
          message={`למחוק את התבנית "${template.name}"? לא ניתן לבטל פעולה זו.`}
          confirmText="מחק"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
};

// ===== כרטיס תבנית בודד =====
const TemplateCard = ({ template, isDark, onClick }: { template: List; isDark: boolean; onClick: () => void }) => {
  const productCount = template.products?.length ?? 0;
  return (
    <Box
      onClick={() => { haptic('light'); onClick(); }}
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 120, flexShrink: 0,
        p: 1.5, borderRadius: '16px',
        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        border: '1.5px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:active': { transform: 'scale(0.95)', opacity: 0.8 },
        gap: 0.75,
      }}
    >
      <Box sx={{
        width: 50, height: 50, borderRadius: '13px',
        bgcolor: template.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        boxShadow: `0 3px 10px ${template.color}45`,
        mb: 0.25,
      }}>
        {template.icon}
      </Box>
      <Typography sx={{
        fontSize: 12.5, fontWeight: 700, color: 'text.primary',
        textAlign: 'center', lineHeight: 1.25,
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        width: '100%',
      }}>
        {template.name}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
        {productCount > 0 ? `${productCount} פריטים` : 'ריק'}
      </Typography>
    </Box>
  );
};

// ===== אזור תבניות =====
export const TemplatesSection = ({ templates, isDark, onApply, onDelete, showToast }: TemplatesSectionProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<List | null>(null);

  const handleClose = useCallback(() => setSelectedTemplate(null), []);

  if (templates.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25, px: 0.5 }}>
        <StarIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#B45309' }}>
          תבניות שמורות
        </Typography>
      </Box>

      {/* גלילה אופקית */}
      <Box sx={{
        display: 'flex', gap: 1.25, overflowX: 'auto', pb: 0.5,
        scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        WebkitOverflowScrolling: 'touch',
        mx: -0.5, px: 0.5,
      }}>
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isDark={isDark}
            onClick={() => setSelectedTemplate(template)}
          />
        ))}
      </Box>

      {/* Bottom Sheet */}
      {selectedTemplate && (
        <TemplateBottomSheet
          template={selectedTemplate}
          isDark={isDark}
          onClose={handleClose}
          onApply={onApply}
          onDelete={onDelete}
          showToast={showToast}
        />
      )}
    </Box>
  );
};
