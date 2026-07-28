import { useRef, useState } from 'react';
import {
  Dialog, Box, Typography, IconButton, Button, TextField, Checkbox,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { haptic, CATEGORY_ICONS } from '../../../../global/helpers';
import { parseOcrList, type OcrListItem } from '../../../../global/helpers/parseOcrList';
import { ocrApi } from '../../../../services/api';

interface ReviewItem extends OcrListItem {
  id: string;
  checked: boolean;
}

// רוחב מקסימלי לצילום לפני שליחה - גם כדי לעמוד במגבלת 1MB של OCR.space
// וגם להעלאה מהירה יותר במובייל. איכות JPEG בינונית-גבוהה מספיקה לטקסט.
const MAX_UPLOAD_WIDTH = 1600;
const JPEG_QUALITY = 0.82;

async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_UPLOAD_WIDTH / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

interface ScanListPhotoProps {
  open: boolean;
  onClose: () => void;
  // המשתמש אישר את הרשימה - שם לכל פריט מאושר, לפי הסדר
  onConfirm: (names: string[]) => void;
}

type Phase = 'intro' | 'uploading' | 'review' | 'error';

/**
 * צילום/בחירת תמונה של פתק רשימת קניות, זיהוי טקסט (OCR.space, ראו
 * server/api/src/services/ocr.service.ts), ומסך סקירה/עריכה לפני הוספה -
 * קריטי כי זיהוי כתב יד לא מדויק, המסך הזה הוא קו ההגנה האמיתי.
 */
export const ScanListPhoto = ({ open, onClose, onConfirm }: ScanListPhotoProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);

  const reset = () => {
    setPhase('intro');
    setItems([]);
    setErrorMsg('');
    setDetectedTitle(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhase('uploading');
    try {
      const compressed = await compressImageFile(file);
      const text = await ocrApi.scanList(compressed);
      const { items: parsed, detectedTitle: title } = parseOcrList(text);
      if (parsed.length === 0) {
        setErrorMsg('לא זיהינו טקסט ברור בתמונה. נסה תמונה ברורה וחדה יותר, עם תאורה טובה.');
        setPhase('error');
        return;
      }
      setDetectedTitle(title);
      setItems(parsed.map((p, i) => ({ ...p, id: `${i}-${p.name}`, checked: true })));
      setPhase('review');
    } catch {
      setErrorMsg('משהו השתבש בזיהוי הטקסט. נסה שוב, או הוסף את הפריטים ידנית.');
      setPhase('error');
    }
  };

  const toggleItem = (id: string) => {
    haptic('light');
    setItems(prev => prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  };

  const updateItemName = (id: string, name: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, name } : it));
  };

  const removeItem = (id: string) => {
    haptic('light');
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const addBlankItem = () => {
    haptic('light');
    setItems(prev => [...prev, { id: `manual-${Date.now()}`, name: '', category: 'אחר', checked: true }]);
  };

  const checkedCount = items.filter(it => it.checked && it.name.trim().length >= 2).length;

  const handleConfirm = () => {
    haptic('medium');
    const names = items
      .filter(it => it.checked && it.name.trim().length >= 2)
      .map(it => it.name.trim());
    reset();
    onClose();
    onConfirm(names);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      {/* בלי capture="environment" בכוונה - זה כופה פתיחת מצלמה ישירות
          ומדלג על אפשרות "בחר מהגלריה" בדפדפנים רבים. בלי זה, ה-picker
          הטבעי של המערכת מציג גם מצלמה וגם גלריה (כמו בגלריית QRScanner). */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <IconButton onClick={handleClose} aria-label="סגור">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, flex: 1 }}>סריקת רשימה מהדף</Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
          {phase === 'intro' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, pt: 4 }}>
              <DocumentScannerIcon sx={{ fontSize: 60, color: '#14B8A6' }} />
              <Typography sx={{ fontSize: 18, fontWeight: 800 }}>צלם פתק עם רשימת קניות</Typography>
              <Typography sx={{ fontSize: 14, color: 'text.secondary', maxWidth: 320 }}>
                נזהה את הטקסט בתמונה ונציע לך רשימת מוצרים - תוכל לערוך ולאשר
                לפני שמוסיפים אותם. <b>התמונה נשלחת לשירות זיהוי טקסט חיצוני</b> (OCR.space)
                לצורך הזיהוי בלבד, ולא נשמרת אצלנו.
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.disabled', maxWidth: 320 }}>
                זיהוי כתב יד לא תמיד מדויק - תמיד תוכל לתקן לפני ההוספה.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<DocumentScannerIcon />}
                onClick={() => { haptic('medium'); fileInputRef.current?.click(); }}
                sx={{ mt: 1, borderRadius: '12px', px: 4 }}
              >
                צלם / בחר תמונה
              </Button>
            </Box>
          )}

          {phase === 'uploading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' }}>
              <CircularProgress />
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>מזהה טקסט בתמונה...</Typography>
            </Box>
          )}

          {phase === 'error' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, pt: 4 }}>
              <Typography sx={{ fontSize: 14, color: 'error.main' }}>{errorMsg}</Typography>
              <Button variant="outlined" onClick={() => { haptic('light'); reset(); }}>נסה שוב</Button>
            </Box>
          )}

          {phase === 'review' && (
            <Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
                זיהינו {items.length} שורות - בטל סימון/מחק מה שלא רלוונטי, ותקן שמות לפי הצורך.
              </Typography>
              {detectedTitle && (
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1.5, fontStyle: 'italic' }}>
                  זיהינו גם כותרת "{detectedTitle}" - לא נוספה כפריט.
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {items.map(it => (
                  <Box key={it.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    p: 0.5, borderRadius: '10px',
                    bgcolor: it.checked ? 'action.hover' : 'transparent',
                    opacity: it.checked ? 1 : 0.5,
                  }}>
                    <Checkbox checked={it.checked} onChange={() => toggleItem(it.id)} size="small" />
                    <Typography sx={{ fontSize: 16, width: 24, textAlign: 'center' }}>
                      {CATEGORY_ICONS[it.category as keyof typeof CATEGORY_ICONS] || '📦'}
                    </Typography>
                    <TextField
                      value={it.name}
                      onChange={(e) => updateItemName(it.id, e.target.value)}
                      variant="standard"
                      fullWidth
                      placeholder="שם המוצר"
                      slotProps={{ input: { disableUnderline: true } }}
                      sx={{ '& .MuiInputBase-input': { fontSize: 14.5 } }}
                    />
                    <IconButton size="small" onClick={() => removeItem(it.id)} aria-label="הסר">
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
              <Button
                startIcon={<AddIcon />}
                onClick={addBlankItem}
                sx={{ mt: 1.5 }}
              >
                הוסף שורה ידנית
              </Button>
            </Box>
          )}
        </Box>

        {phase === 'review' && (
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={checkedCount === 0}
              onClick={handleConfirm}
              sx={{ borderRadius: '12px' }}
            >
              {checkedCount > 0 ? `הוסף ${checkedCount} פריטים לרשימה` : 'בחר לפחות פריט אחד'}
            </Button>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};
