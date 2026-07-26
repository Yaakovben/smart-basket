import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { ClearableTextField } from '../../../global/components';
import type { PriceChainStatus } from '../../priceComparison';

interface PriceSyncBulkImportFormProps {
  chains: PriceChainStatus[];
  bulkChainId: string;
  setBulkChainId: (id: string) => void;
  bulkText: string;
  setBulkText: (text: string) => void;
  bulkLoading: boolean;
  isDark: boolean;
  onImport: () => void;
  onCancel: () => void;
}

// טופס ייבוא המוני של סניפים מטקסט CSV
export const PriceSyncBulkImportForm = ({ chains, bulkChainId, setBulkChainId, bulkText, setBulkText, bulkLoading, isDark, onImport, onCancel }: PriceSyncBulkImportFormProps) => (
  <Box sx={{
    p: 1.25, borderRadius: '12px',
    bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)',
    border: '1px solid', borderColor: 'rgba(20,184,166,0.25)',
    display: 'flex', flexDirection: 'column', gap: 0.75,
  }}>
    <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6' }}>
      ייבוא המוני סניפים
    </Typography>
    <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.5 }}>
      כל שורה: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 4px' }}>שם, עיר, כתובת, lat, lng</code>
    </Typography>
    {/* בחירת רשת */}
    <select
      value={bulkChainId}
      onChange={e => setBulkChainId(e.target.value)}
      style={{
        padding: '6px 8px', fontSize: 12, borderRadius: 8,
        border: '1px solid rgba(20,184,166,0.3)',
        background: isDark ? '#1e1b3a' : 'white',
        color: isDark ? 'white' : 'black',
      }}
    >
      {chains.map(c => (
        <option key={c.chainId} value={c.chainId}>{c.chainName}</option>
      ))}
    </select>
    <ClearableTextField
      multiline minRows={4} maxRows={10}
      placeholder={'שופרסל בני ברק, בני ברק, רבי עקיבא 50, 32.0858, 34.8330\nשופרסל אלעד, אלעד, שמעון בן שטח 12, 32.0525, 34.9520'}
      value={bulkText}
      onChange={e => setBulkText(e.target.value)}
      onClear={() => setBulkText('')}
      sx={{
        '& textarea': { fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 },
        '& .MuiInputBase-root': { p: 0.75 },
      }}
    />
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button
        size="small" variant="contained"
        onClick={onImport}
        disabled={bulkLoading || !bulkText.trim()}
        startIcon={bulkLoading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : null}
        sx={{
          flex: 1, fontSize: 12, py: 0.6, textTransform: 'none',
          bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' },
        }}
      >
        {bulkLoading ? 'מייבא...' : `ייבא ל-${chains.find(c => c.chainId === bulkChainId)?.chainName}`}
      </Button>
      <Button size="small" onClick={onCancel}
        sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'none' }}>
        ביטול
      </Button>
    </Box>
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.45 }}>
      💡 איך לקבל lat,lng: גוגל מפס → לחיצה ימנית על המקום → המספרים מופיעים → העתק
    </Typography>
  </Box>
);
