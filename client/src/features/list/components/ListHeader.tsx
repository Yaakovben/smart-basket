import { memo, useState, useCallback, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Tabs, Tab, InputAdornment, Grow } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { List, User } from '../../../global/types';
import { COMMON_STYLES, SIZES, haptic } from '../../../global/helpers';
import { MembersButton } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== Styles =====
const glassButtonSx = {
  ...COMMON_STYLES.glassButton,
  ...SIZES.iconButton.md
};

// ===== Props =====
interface ListHeaderProps {
  list: List;
  user: User;
  filter: ListFilter;
  pendingCount: number;
  purchasedCount: number;
  allMembers: User[];
  isOwner: boolean;
  onBack: () => void;
  onFilterChange: (filter: ListFilter) => void;
  onEditList: () => void;
  onShareList: () => void;
  onShowMembers: () => void;
  onShowInvite: () => void;
  onQuickAdd?: (name: string) => void;
}

// ===== Component =====
export const ListHeader = memo(({
  list,
  user,
  filter,
  pendingCount,
  purchasedCount,
  allMembers,
  isOwner,
  onBack,
  onFilterChange,
  onEditList,
  onShareList,
  onShowMembers,
  onShowInvite,
  onQuickAdd
}: ListHeaderProps) => {
  const { t } = useSettings();
  const [quickAddValue, setQuickAddValue] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = useCallback(() => {
    const trimmed = quickAddValue.trim();
    if (trimmed.length < 2 || !onQuickAdd) return;

    haptic('light');
    onQuickAdd(trimmed);
    setQuickAddValue('');

    // Show inline success feedback
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);

    // Keep focus on input for rapid additions
    inputRef.current?.focus();
  }, [quickAddValue, onQuickAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  }, [handleQuickAdd]);

  return (
    <Box sx={{
      background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
      p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
      borderRadius: '0 0 24px 24px',
      flexShrink: 0,
      boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)'
    }}>
      {/* Title Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
        <IconButton
          onClick={onBack}
          sx={glassButtonSx}
          aria-label={t('back')}
        >
          <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
        </IconButton>
        <Typography sx={{ flex: 1, color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700, textAlign: 'center' }}>
          {list.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {isOwner && (
            <IconButton
              onClick={onEditList}
              sx={glassButtonSx}
              aria-label={t('editList')}
            >
              <EditIcon sx={{ color: 'white', fontSize: 22 }} />
            </IconButton>
          )}
          <IconButton
            onClick={onShareList}
            sx={glassButtonSx}
            aria-label={t('shareList')}
          >
            <ShareIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Members Row (Group Only) */}
      {list.isGroup && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <MembersButton members={allMembers} currentUserId={user.id} onClick={onShowMembers} />
          <IconButton
            onClick={onShowInvite}
            sx={glassButtonSx}
            aria-label={t('inviteFriends')}
          >
            <PersonAddIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
        </Box>
      )}

      {/* Quick Add (Pending Tab Only) */}
      {filter === 'pending' && (
        <Box sx={{ mb: 1.5 }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder={t('quickAddPlaceholder')}
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                ...(justAdded && {
                  boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.4)',
                  borderColor: '#22C55E'
                }),
                '&.Mui-focused': {
                  boxShadow: justAdded
                    ? '0 0 0 3px rgba(34, 197, 94, 0.4)'
                    : '0 0 0 3px rgba(255,255,255,0.3)'
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box sx={{
                    fontSize: 18,
                    transition: 'transform 0.2s ease',
                    transform: justAdded ? 'scale(1.2)' : 'scale(1)'
                  }}>
                    {justAdded ? '✅' : '🛒'}
                  </Box>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Grow in={quickAddValue.trim().length >= 2}>
                    <IconButton
                      onClick={handleQuickAdd}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: 32,
                        height: 32,
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                      aria-label={t('add')}
                    >
                      <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Grow>
                </InputAdornment>
              ),
              'aria-label': t('quickAddPlaceholder')
            }}
          />
        </Box>
      )}

      {/* Filter Tabs */}
      <Tabs
        value={filter}
        onChange={(_, v) => onFilterChange(v)}
        variant="fullWidth"
        aria-label={t('toBuy')}
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          borderRadius: { xs: '10px', sm: '12px' },
          p: { xs: 0.5, sm: 0.6 },
          minHeight: 'auto',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            borderRadius: { xs: '8px', sm: '10px' },
            py: { xs: 1.25, sm: 1.5 },
            minHeight: 'auto',
            fontSize: { xs: 15, sm: 16 },
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
          }
        }}
      >
        <Tab value="pending" label={`${t('toBuy')} (${pendingCount})`} />
        <Tab value="purchased" label={`${t('purchased')} (${purchasedCount})`} />
      </Tabs>
    </Box>
  );
});

ListHeader.displayName = 'ListHeader';
