import {
  Box, Typography, TextField, Button, IconButton, Tabs, Tab,
  Chip, Avatar, Fab, Select, MenuItem, InputAdornment, Alert, FormControl
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import type { Product, List, User, ProductUnit, ProductCategory } from '../../../global/types';
import { haptic, CATEGORY_ICONS, LIST_ICONS, GROUP_ICONS, LIST_COLORS, generateInviteMessage, generateShareListMessage, COMMON_STYLES, SIZES } from '../../../global/helpers';
import { Modal, ConfirmModal, MemberAvatar, MembersButton } from '../../../global/components';
import { SwipeItem } from './SwipeItem';
import { useSettings } from '../../../global/context/SettingsContext';
import { useList } from '../hooks/useList';

// ===== Reusable Styles =====
const glassButtonSx = {
  ...COMMON_STYLES.glassButton,
  ...SIZES.iconButton.md
};

const labelSx = {
  fontSize: SIZES.text.md - 1,
  fontWeight: 600,
  color: 'text.secondary',
  mb: 1
};

const quantityBoxSx = {
  display: 'flex',
  border: '1.5px solid',
  borderColor: 'divider',
  borderRadius: '12px',
  overflow: 'hidden',
  height: 52
};

const quantityBtnSx = {
  minWidth: 52,
  borderRadius: 0,
  bgcolor: 'action.hover',
  fontSize: 24
};

// ===== Props Interface =====
interface ListPageProps {
  list: List;
  user: User;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
}

export const ListComponent = ({ list, onBack, onUpdateList, onLeaveList, onDeleteList, showToast, user }: ListPageProps) => {
  const { t } = useSettings();

  const {
    // State
    filter, search, showAdd, showEdit, showDetails, showInvite,
    showMembers, showShareList, showEditList, editListData,
    confirmDeleteList, confirm, newP, openItemId, showHint, addError,
    fabPosition, isDragging,
    // Computed
    pending, purchased, items, allMembers, isOwner,
    // Setters
    setFilter, setSearch, setShowAdd, setShowEdit, setShowDetails,
    setShowInvite, setShowMembers, setShowShareList, setShowEditList,
    setEditListData, setConfirmDeleteList, setConfirm, setOpenItemId,
    // Handlers
    handleDragStart, handleDragMove, handleDragEnd, dismissHint,
    handleAdd, handleEditList, saveListChanges, handleDeleteList,
    removeMember, leaveList, toggleProduct, deleteProduct, saveEditedProduct,
    updateNewProductField, updateEditProductField, incrementQuantity,
    decrementQuantity, closeAddModal
  } = useList({
    list, user, onUpdateList, onLeaveList, onDeleteList, onBack, showToast
  });

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' }, borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
          <IconButton onClick={onBack} sx={glassButtonSx}>
            <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700, textAlign: 'center' }}>{list.name}</Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {isOwner && (
              <IconButton onClick={handleEditList} sx={glassButtonSx}>
                <EditIcon sx={{ color: 'white', fontSize: 22 }} />
              </IconButton>
            )}
            <IconButton onClick={() => setShowShareList(true)} sx={glassButtonSx}>
              <ShareIcon sx={{ color: 'white', fontSize: 22 }} />
            </IconButton>
          </Box>
        </Box>

        {list.isGroup && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <MembersButton members={allMembers} currentUserId={user.id} onClick={() => setShowMembers(true)} />
            <IconButton onClick={() => setShowInvite(true)} sx={glassButtonSx}>
              <PersonAddIcon sx={{ color: 'white', fontSize: 22 }} />
            </IconButton>
          </Box>
        )}

        <TextField
          fullWidth
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: '12px' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment> }}
        />

        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          variant="fullWidth"
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
          <Tab value="pending" label={`${t('toBuy')} (${pending.length})`} />
          <Tab value="purchased" label={`${t('purchased')} (${purchased.length})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, sm: 2.5 }, pb: { xs: 'calc(120px + env(safe-area-inset-bottom))', sm: 'calc(110px + env(safe-area-inset-bottom))' }, WebkitOverflowScrolling: 'touch' }} onClick={() => setOpenItemId(null)}>
        {showHint && items.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 }, p: { xs: '10px 14px', sm: '12px 16px' }, bgcolor: 'action.hover', borderRadius: { xs: '10px', sm: '12px' }, mb: { xs: 1.25, sm: 1.5 }, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 } }}>💡</Typography>
            <Typography sx={{ flex: 1, fontSize: { xs: 12, sm: 13 }, color: 'text.secondary' }}>
              {t('swipeHint')}
            </Typography>
            <IconButton size="small" onClick={dismissHint} sx={{ color: 'primary.main' }}>
              <CloseIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
            </IconButton>
          </Box>
        )}

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
            <Box sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, borderRadius: '50%', background: filter === 'pending' ? 'linear-gradient(135deg, #CCFBF1, #99F6E4)' : 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2, sm: 2.5 }, fontSize: { xs: 44, sm: 56 } }}>
              {filter === 'pending' ? '🎉' : '📦'}
            </Box>
            <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              {filter === 'pending' ? t('allDone') : t('noProducts')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', mb: { xs: 2.5, sm: 3 } }}>
              {filter === 'pending' ? t('allDoneDesc') : t('noProductsDesc')}
            </Typography>
            {filter === 'pending' && (
              <Button
                variant="contained"
                onClick={() => { haptic('light'); setShowAdd(true); }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2.5, sm: 3 }, py: { xs: 1.25, sm: 1.5 }, fontSize: { xs: 14, sm: 15 } }}
              >
                <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                <span>{t('addProduct')}</span>
              </Button>
            )}
          </Box>
        ) : items.map((p: Product) => (
          <SwipeItem
            key={p.id}
            product={p}
            isPurchased={p.isPurchased}
            isOpen={openItemId === p.id}
            onOpen={() => setOpenItemId(p.id)}
            onClose={() => setOpenItemId(null)}
            onToggle={() => toggleProduct(p.id)}
            onEdit={() => setShowEdit({ ...p })}
            onDelete={() => deleteProduct(p.id)}
            onClick={() => { setShowDetails(p); dismissHint(); }}
          />
        ))}
      </Box>

      {/* FAB */}
      {(items.length > 0 || filter === 'purchased') && (
        <Box
          sx={{
            position: 'fixed',
            bottom: fabPosition ? undefined : 'calc(70px + env(safe-area-inset-bottom))',
            left: fabPosition ? undefined : '50%',
            transform: fabPosition ? undefined : 'translateX(-50%)',
            top: fabPosition ? fabPosition.y - 28 : undefined,
            right: fabPosition ? window.innerWidth - fabPosition.x - 28 : undefined,
            zIndex: 5,
            touchAction: items.length > 3 ? 'none' : 'auto'
          }}
          onTouchStart={items.length > 3 ? (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY) : undefined}
          onTouchMove={items.length > 3 ? (e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY) : undefined}
          onTouchEnd={items.length > 3 ? handleDragEnd : undefined}
          onMouseDown={items.length > 3 ? (e) => handleDragStart(e.clientX, e.clientY) : undefined}
          onMouseMove={items.length > 3 && isDragging ? (e) => handleDragMove(e.clientX, e.clientY) : undefined}
          onMouseUp={items.length > 3 ? handleDragEnd : undefined}
          onMouseLeave={items.length > 3 ? handleDragEnd : undefined}
        >
          {items.length > 3 ? (
            <Fab
              color="primary"
              onClick={() => { if (!isDragging) { haptic('medium'); setShowAdd(true); } }}
              sx={{ cursor: isDragging ? 'grabbing' : 'grab', transition: isDragging ? 'none' : 'all 0.2s ease', width: { xs: 52, sm: 56 }, height: { xs: 52, sm: 56 } }}
            >
              <AddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
            </Fab>
          ) : (
            <Button
              variant="contained"
              onClick={() => { haptic('medium'); setShowAdd(true); }}
              sx={{
                borderRadius: { xs: '14px', sm: '16px' },
                px: { xs: 2.5, sm: 3 },
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: 14, sm: 15 },
                fontWeight: 600,
                background: 'linear-gradient(135deg, #14B8A6, #10B981)',
                boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': { background: 'linear-gradient(135deg, #0D9488, #059669)', boxShadow: '0 10px 28px rgba(20, 184, 166, 0.5)' }
              }}
            >
              <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              <span>{t('addProduct')}</span>
            </Button>
          )}
        </Box>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <Modal title={t('newProduct')} onClose={closeAddModal}>
          {addError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>⚠️ {addError}</Alert>}
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('name')}</Typography>
            <TextField fullWidth value={newP.name} onChange={e => updateNewProductField('name', e.target.value)} placeholder={t('productName')} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={labelSx}>{t('quantity')}</Typography>
              <Box sx={quantityBoxSx}>
                <Button onClick={() => decrementQuantity('new')} sx={quantityBtnSx}>−</Button>
                <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent' }} value={newP.quantity} onChange={e => updateNewProductField('quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                <Button onClick={() => incrementQuantity('new')} sx={quantityBtnSx}>+</Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={labelSx}>{t('unit')}</Typography>
              <FormControl fullWidth>
                <Select value={newP.unit} onChange={e => updateNewProductField('unit', e.target.value as ProductUnit)} sx={{ height: 52 }}>
                  <MenuItem value="יח׳">{t('unitPiece')}</MenuItem>
                  <MenuItem value="ק״ג">{t('unitKg')}</MenuItem>
                  <MenuItem value="גרם">{t('unitGram')}</MenuItem>
                  <MenuItem value="ליטר">{t('unitLiter')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('category')}</Typography>
            <FormControl fullWidth>
              <Select value={newP.category} onChange={e => updateNewProductField('category', e.target.value as ProductCategory)}>
                {Object.keys(CATEGORY_ICONS).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Button variant="contained" fullWidth onClick={() => { haptic('medium'); handleAdd(); }}>{t('add')}</Button>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEdit && (
        <Modal title={t('editProduct')} onClose={() => setShowEdit(null)}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('name')}</Typography>
            <TextField fullWidth value={showEdit.name} onChange={e => updateEditProductField('name', e.target.value)} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={labelSx}>{t('quantity')}</Typography>
              <Box sx={quantityBoxSx}>
                <Button onClick={() => decrementQuantity('edit')} sx={quantityBtnSx}>−</Button>
                <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50, background: 'transparent' }} value={showEdit.quantity} onChange={e => updateEditProductField('quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                <Button onClick={() => incrementQuantity('edit')} sx={quantityBtnSx}>+</Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={labelSx}>{t('unit')}</Typography>
              <FormControl fullWidth>
                <Select value={showEdit.unit} onChange={e => updateEditProductField('unit', e.target.value as ProductUnit)} sx={{ height: 52 }}>
                  <MenuItem value="יח׳">{t('unitPiece')}</MenuItem>
                  <MenuItem value="ק״ג">{t('unitKg')}</MenuItem>
                  <MenuItem value="גרם">{t('unitGram')}</MenuItem>
                  <MenuItem value="ליטר">{t('unitLiter')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('category')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <Chip key={cat} label={`${icon} ${cat}`} onClick={() => updateEditProductField('category', cat as ProductCategory)} variant={showEdit.category === cat ? 'filled' : 'outlined'} color={showEdit.category === cat ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={saveEditedProduct}>{t('save')}</Button>
        </Modal>
      )}

      {/* Product Details Modal */}
      {showDetails && (
        <Modal title={t('productDetails')} onClose={() => setShowDetails(null)}>
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '18px', bgcolor: 'rgba(20, 184, 166, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.15)' }}>
              <Typography sx={{ fontSize: 36 }}>{CATEGORY_ICONS[showDetails.category]}</Typography>
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{showDetails.name}</Typography>
            <Typography sx={{ fontSize: 15, color: 'primary.main', fontWeight: 600 }}>{showDetails.quantity} {showDetails.unit}</Typography>
          </Box>
          <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{t('category')}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{showDetails.category}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{t('addedBy')}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: showDetails.addedBy === user.name ? 'primary.main' : 'text.primary' }}>
                {showDetails.addedBy === user.name ? t('you') : showDetails.addedBy}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{t('date')}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{showDetails.createdDate || '-'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: '12px 16px' }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{t('time')}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{showDetails.createdTime || '-'}</Typography>
            </Box>
          </Box>
        </Modal>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowInvite(false)} />
          <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', borderRadius: '20px', p: 3, zIndex: 1001, width: '90%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <IconButton onClick={() => setShowInvite(false)} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover' }} size="small">
              <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </IconButton>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 64, height: 64, background: COMMON_STYLES.gradients.header, mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
                <PersonAddIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>{t('inviteFriends')}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t('shareDetails')}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'rgba(20, 184, 166, 0.08)', borderRadius: '12px', border: '1.5px solid', borderColor: 'rgba(20, 184, 166, 0.2)', mb: 2.5, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 16px', borderBottom: '1px solid', borderColor: 'rgba(20, 184, 166, 0.15)' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>{t('groupCode')}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'primary.main', letterSpacing: 3, fontFamily: 'monospace' }}>{list.inviteCode}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 16px' }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 600 }}>{t('password')}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'primary.main', letterSpacing: 3, fontFamily: 'monospace' }}>{list.password}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button fullWidth onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateInviteMessage(list))}`)} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#1ebe5a' }, gap: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </Button>
              <Button variant="outlined" fullWidth onClick={() => { navigator.clipboard?.writeText(generateInviteMessage(list)).then(() => { showToast(t('copied')); setShowInvite(false); }).catch(() => showToast(t('copyError'))); }}>
                📋 {t('copy')}
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* Members Modal */}
      {showMembers && (
        <Modal title={t('members')} onClose={() => setShowMembers(false)}>
          {allMembers.map((m, i) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, borderBottom: i < allMembers.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
              <MemberAvatar member={m} size={44} index={i} />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>{m.name}</Typography>
                  {m.id === list.owner.id && <Chip label={t('admin')} size="small" sx={{ bgcolor: 'warning.light', color: 'warning.dark', height: 22 }} />}
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{m.email}</Typography>
              </Box>
              {isOwner && m.id !== list.owner.id && (
                <Button
                  onClick={() => removeMember(m.id)}
                  size="small"
                  sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontSize: 12, fontWeight: 600, px: 1.5, py: 0.5, minWidth: 'auto', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}
                >
                  {t('removeMember')}
                </Button>
              )}
            </Box>
          ))}
          {!isOwner && list.isGroup && (
            <Button fullWidth onClick={leaveList} sx={{ mt: 2.5, bgcolor: 'rgba(239, 68, 68, 0.1)', color: 'error.main', fontWeight: 600, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}>
              {t('leaveGroup')}
            </Button>
          )}
        </Modal>
      )}

      {/* Share List Modal */}
      {showShareList && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowShareList(false)} />
          <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', borderRadius: '20px', p: 3, zIndex: 1001, width: '90%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <IconButton onClick={() => setShowShareList(false)} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'action.hover' }} size="small">
              <CloseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </IconButton>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 64, height: 64, background: COMMON_STYLES.gradients.header, mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
                <ShareIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'text.primary' }}>{t('shareList')}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{t('shareList')}</Typography>
            </Box>
            <Box sx={{ bgcolor: 'rgba(20, 184, 166, 0.08)', borderRadius: '12px', border: '1.5px solid', borderColor: 'rgba(20, 184, 166, 0.2)', mb: 2.5, overflow: 'hidden' }}>
              <Box sx={{ p: '12px 16px', borderBottom: '1px solid', borderColor: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'primary.main' }}>{list.name}</Typography>
                <Chip label={`${pending.length} ${t('items')}`} size="small" sx={{ bgcolor: 'transparent', color: 'primary.main' }} />
              </Box>
              <Box sx={{ p: '12px 16px', maxHeight: 140, overflow: 'auto' }}>
                {pending.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center', py: 1 }}>{t('noProducts')}</Typography>
                ) : (
                  pending.slice(0, 5).map((p: Product, i: number) => (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: i < Math.min(pending.length, 5) - 1 ? '1px solid' : 'none', borderColor: 'rgba(20, 184, 166, 0.15)' }}>
                      <Typography sx={{ fontSize: 14, color: 'primary.dark' }}>• {p.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: 'primary.main' }}>{p.quantity} {p.unit}</Typography>
                    </Box>
                  ))
                )}
                {pending.length > 5 && (
                  <Typography sx={{ fontSize: 13, color: 'primary.main', textAlign: 'center', pt: 1 }}>+ {pending.length - 5} {t('items')}</Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button fullWidth onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateShareListMessage(list))}`)} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#1ebe5a' }, gap: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </Button>
              <Button variant="outlined" fullWidth onClick={() => { navigator.clipboard?.writeText(generateShareListMessage(list)).then(() => { showToast(t('copied')); setShowShareList(false); }).catch(() => showToast(t('copyError'))); }}>
                📋 {t('copy')}
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* Edit List Modal */}
      {showEditList && editListData && (
        <Modal title={list.isGroup ? t('editGroup') : t('editList')} onClose={() => setShowEditList(false)}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('name')}</Typography>
            <TextField fullWidth value={editListData.name} onChange={e => setEditListData({ ...editListData, name: e.target.value })} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(list.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => (
                <Button key={i} onClick={() => setEditListData({ ...editListData, icon: i })} sx={{ width: 48, height: 48, minWidth: 48, borderRadius: '12px', border: editListData.icon === i ? '2px solid' : '1.5px solid', borderColor: editListData.icon === i ? 'primary.main' : 'divider', bgcolor: editListData.icon === i ? 'primary.light' : 'background.paper', fontSize: 22 }}>
                  {i}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={labelSx}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => setEditListData({ ...editListData, color: c })} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: c, border: editListData.color === c ? '3px solid' : 'none', borderColor: 'text.primary', cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={saveListChanges}>{t('saveChanges')}</Button>
          <Button fullWidth onClick={() => { setShowEditList(false); setConfirmDeleteList(true); }} sx={{ mt: 1.5, py: 1.25, borderRadius: '12px', bgcolor: '#FEE2E2', color: '#DC2626', fontSize: 14, fontWeight: 600, '&:hover': { bgcolor: '#FECACA' } }}>
            {list.isGroup ? t('deleteGroup') : t('deleteList')}
          </Button>
        </Modal>
      )}

      {confirmDeleteList && <ConfirmModal title={list.isGroup ? t('deleteGroup') : t('deleteList')} message={`${t('delete')} "${list.name}"?`} confirmText={t('delete')} onConfirm={handleDeleteList} onCancel={() => setConfirmDeleteList(false)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </Box>
  );
};
