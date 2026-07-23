import { Box, Typography, TextField, Button } from '@mui/material';
import type { NewBranchForm } from '../types/priceSync-types';

interface PriceSyncBranchAddFormProps {
  newBranch: NewBranchForm;
  setNewBranch: React.Dispatch<React.SetStateAction<NewBranchForm>>;
  isDark: boolean;
  onSave: () => void;
  onCancel: () => void;
}

// טופס הוספת סניף ידני - מוצג בתוך הפאנל המורחב של רשת
export const PriceSyncBranchAddForm = ({ newBranch, setNewBranch, isDark, onSave, onCancel }: PriceSyncBranchAddFormProps) => (
  <Box sx={{
    p: 1, mb: 0.6, borderRadius: '8px',
    bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.04)',
    border: '1px dashed', borderColor: 'rgba(20,184,166,0.3)',
    display: 'flex', flexDirection: 'column', gap: 0.6,
  }}>
    <TextField size="small" placeholder="שם הסניף *" value={newBranch.storeName}
      onChange={e => setNewBranch(p => ({ ...p, storeName: e.target.value }))}
      sx={{ '& input': { fontSize: 12, py: 0.6 } }} />
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <TextField size="small" placeholder="עיר" value={newBranch.city}
        onChange={e => setNewBranch(p => ({ ...p, city: e.target.value }))}
        sx={{ flex: 1, '& input': { fontSize: 12, py: 0.6 } }} />
      <TextField size="small" placeholder="כתובת" value={newBranch.address}
        onChange={e => setNewBranch(p => ({ ...p, address: e.target.value }))}
        sx={{ flex: 1, '& input': { fontSize: 12, py: 0.6 } }} />
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <TextField size="small" placeholder="lat *" value={newBranch.lat}
        onChange={e => setNewBranch(p => ({ ...p, lat: e.target.value }))}
        sx={{ flex: 1, '& input': { fontSize: 11, py: 0.6, fontFamily: 'monospace' } }} />
      <TextField size="small" placeholder="lng *" value={newBranch.lng}
        onChange={e => setNewBranch(p => ({ ...p, lng: e.target.value }))}
        sx={{ flex: 1, '& input': { fontSize: 11, py: 0.6, fontFamily: 'monospace' } }} />
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Button size="small" variant="contained" onClick={onSave}
        sx={{ flex: 1, fontSize: 11.5, py: 0.5, textTransform: 'none', bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' } }}>
        שמור
      </Button>
      <Button size="small" onClick={onCancel}
        sx={{ fontSize: 11.5, py: 0.5, textTransform: 'none', color: 'text.secondary' }}>
        ביטול
      </Button>
    </Box>
    <Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center' }}>
      טיפ: גוגל מפס → לחיצה ימנית על הכתובת → "What's here?" → העתק lat,lng
    </Typography>
  </Box>
);
