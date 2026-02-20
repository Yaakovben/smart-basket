import { memo, useRef, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Button, keyframes } from '@mui/material';
import type { Product, List, User } from '../../../global/types';
import { ConfirmModal, Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { authApi } from '../../../services/api';
import { useList } from '../hooks/useList';

// ===== אנימציות חגיגה =====
const floatUp = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-110vh) rotate(540deg) scale(0.2); opacity: 0; }
`;

const fallDown = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 0; }
  15% { transform: translateY(10px) rotate(30deg) scale(1.2); opacity: 1; }
  100% { transform: translateY(90vh) rotate(360deg) scale(0.3); opacity: 0; }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
`;

const flashBg = keyframes`
  0% { opacity: 0; }
  15% { opacity: 0.15; }
  100% { opacity: 0; }
`;

const COLORS = ['#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E', '#3B82F6', '#06B6D4', '#FBBF24', '#A78BFA', '#34D399'];
const EMOJIS = ['🎉', '✨', '⭐', '🛒', '✅', '🎊'];

type ParticleType = 'confetti' | 'emoji' | 'sparkle';

interface Particle {
  id: number;
  type: ParticleType;
  left: string;
  top?: string;
  delay: string;
  duration: string;
  color: string;
  w: number;
  h: number;
  round: boolean;
  direction: 'up' | 'down';
  emoji?: string;
}

// יצירת חלקיק קונפטי
const makeConfetti = (id: number, direction: 'up' | 'down'): Particle => {
  const size = 5 + Math.random() * 8;
  const isRect = id % 3 === 2;
  return {
    id, type: 'confetti', direction,
    left: `${(direction === 'down' ? 10 : 0) + Math.random() * (direction === 'down' ? 80 : 100)}%`,
    delay: `${Math.random() * 0.4}s`,
    duration: `${2 + Math.random() * 1.5}s`,
    color: COLORS[id % COLORS.length],
    w: isRect ? size * 1.5 : size,
    h: isRect ? size * 0.6 : size,
    round: id % 3 === 0
  };
};

const CelebrationOverlay = memo(() => {
  const particles = useMemo((): Particle[] => [
    // 20 חלקיקים עולים + 20 יורדים
    ...Array.from({ length: 20 }, (_, i) => makeConfetti(i, 'up')),
    ...Array.from({ length: 20 }, (_, i) => makeConfetti(20 + i, 'down')),
    // 8 אמוג'ים
    ...Array.from({ length: 8 }, (_, i): Particle => ({
      id: 40 + i, type: 'emoji', direction: i % 2 === 0 ? 'up' : 'down',
      left: `${5 + Math.random() * 90}%`,
      delay: `${0.2 + Math.random() * 0.6}s`,
      duration: `${2.5 + Math.random() * 1}s`,
      color: '', w: 0, h: 0, round: false,
      emoji: EMOJIS[i % EMOJIS.length]
    })),
    // 12 ניצוצות
    ...Array.from({ length: 12 }, (_, i): Particle => {
      const size = 3 + Math.random() * 4;
      return {
        id: 48 + i, type: 'sparkle', direction: 'up',
        left: `${Math.random() * 100}%`,
        top: `${20 + Math.random() * 60}%`,
        delay: `${Math.random() * 1.5}s`,
        duration: `${1 + Math.random() * 1}s`,
        color: '#FBBF24', w: size, h: size, round: true
      };
    })
  ], []);

  const getAnim = (p: Particle) =>
    p.type === 'sparkle'
      ? `${sparkle} ${p.duration} ${p.delay} ease-in-out forwards`
      : `${p.direction === 'up' ? floatUp : fallDown} ${p.duration} ${p.delay} ease-out forwards`;

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {/* הבזק ירוק ברקע */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(34, 197, 94, 0.3), transparent 70%)',
        animation: `${flashBg} 1.5s ease-out forwards`
      }} />

      {particles.map(p => (
        <Box key={p.id} sx={{
          position: 'absolute',
          left: p.left,
          ...(p.type === 'sparkle'
            ? { top: p.top, width: p.w, height: p.h, bgcolor: p.color, borderRadius: '50%', boxShadow: `0 0 ${p.w * 2}px ${p.color}` }
            : p.type === 'emoji'
              ? { [p.direction === 'up' ? 'bottom' : 'top']: p.direction === 'up' ? '-20px' : '60px', fontSize: 18, lineHeight: 1 }
              : { [p.direction === 'up' ? 'bottom' : 'top']: p.direction === 'up' ? '-10px' : '50px', width: p.w, height: p.h, bgcolor: p.color, borderRadius: p.round ? '50%' : '2px' }
          ),
          animation: getAnim(p)
        }}>
          {p.emoji}
        </Box>
      ))}
    </Box>
  );
});
CelebrationOverlay.displayName = 'CelebrationOverlay';

// ===== קומפוננטות משנה =====
import { ListHeader } from './ListHeader';
import { EmptyState } from './EmptyState';
import { SwipeHint } from './SwipeHint';
import { SwipeItem } from './SwipeItem';
import { AddProductFab } from './AddProductFab';
import { AddProductModal, EditProductModal, ProductDetailsModal } from './ProductModals';
import { InviteModal, MembersModal, ShareListModal, EditListModal } from './ListModals';

// ===== Props =====
interface ListPageProps {
  list: List;
  user: User;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onUpdateListLocal: (list: List) => void;
  onUpdateProductsForList: (listId: string, updater: (products: Product[]) => Product[]) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
  onlineUserIds?: Set<string>;
}

// ===== קומפוננטה ראשית =====
export const ListComponent = memo(({ list, onBack, onUpdateList, onUpdateListLocal, onUpdateProductsForList, onLeaveList, onDeleteList, showToast, user, onlineUserIds }: ListPageProps) => {
  const { t, settings, toggleGroupMute, isGroupMuted } = useSettings();
  const isMuteToggling = useRef(false);

  const {
    filter, search, showAdd, showEdit, showDetails, showInvite,
    showMembers, showShareList, showEditList, editListData,
    confirmDeleteList, confirm, newProduct, openItemId, showHint, addError,
    pendingAddName, fabPosition, isDragging,
    pending, purchased, items, allMembers, isOwner, hasProductChanges, hasListChanges,
    setFilter, setSearch, setShowAdd, setShowDetails,
    setShowInvite, setShowMembers, setShowShareList, setShowEditList,
    setEditListData, setConfirmDeleteList, setConfirm, setOpenItemId,
    handleDragStart, handleDragMove, handleDragEnd, dismissHint,
    handleAdd, handleQuickAdd, handleEditList, saveListChanges, handleDeleteList,
    removeMember, leaveList,
    toggleProduct, deleteProduct, saveEditedProduct, openEditProduct, closeEditProduct,
    updateNewProductField, updateEditProductField, incrementQuantity,
    decrementQuantity, closeAddModal,
    duplicateProduct, handleDuplicateIncreaseQuantity, handleDuplicateAddNew, handleDuplicateCancel,
    refreshList, showCelebration
  } = useList({
    list, user, onUpdateList, onUpdateListLocal, onUpdateProductsForList, onLeaveList, onDeleteList, onBack, showToast
  });

  const handleCloseItem = useCallback(() => setOpenItemId(null), [setOpenItemId]);
  const handleShowDetails = useCallback((product: Product) => {
    setShowDetails(product);
    dismissHint();
  }, [setShowDetails, dismissHint]);

  return (
    <Box sx={{
      height: { xs: '100dvh', sm: '100vh' },
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      maxWidth: { xs: '100%', sm: 500, md: 600 },
      mx: 'auto',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <ListHeader
        list={list}
        user={user}
        filter={filter}
        search={search}
        pendingCount={pending.length}
        purchasedCount={purchased.length}
        allMembers={allMembers}
        isOwner={isOwner}
        onBack={onBack}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onEditList={handleEditList}
        onDeleteList={() => setConfirmDeleteList(true)}
        onToggleMute={() => {
          if (isMuteToggling.current) return;
          isMuteToggling.current = true;
          toggleGroupMute(list.id);
          authApi.toggleMuteGroup(list.id)
            .catch(() => { toggleGroupMute(list.id); showToast(t('unknownError')); })
            .finally(() => { isMuteToggling.current = false; });
        }}
        isMuted={isGroupMuted(list.id)}
        mainNotificationsOff={!settings.notifications.enabled}
        onShareList={() => setShowShareList(true)}
        onShowMembers={() => setShowMembers(true)}
        onShowInvite={() => setShowInvite(true)}
        onQuickAdd={handleQuickAdd}
        onlineUserIds={onlineUserIds}
        onRefresh={refreshList}
      />

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: { xs: 2, sm: 2.5 },
          pb: { xs: 'calc(120px + env(safe-area-inset-bottom))', sm: 'calc(110px + env(safe-area-inset-bottom))' },
          WebkitOverflowScrolling: 'touch'
        }}
        onClick={handleCloseItem}
        role="main"
        aria-label={list.name}
      >
        {/* Swipe Hint */}
        {showHint && items.length > 0 && (
          <SwipeHint onDismiss={dismissHint} />
        )}

        {/* Products List or Empty State */}
        {items.length === 0 && !pendingAddName ? (
          <EmptyState filter={filter} totalProducts={pending.length + purchased.length} hasSearch={!!search} onAddProduct={() => setShowAdd(true)} />
        ) : (
          <>
            {items.map((p: Product) => (
              <SwipeItem
                key={p.id}
                product={p}
                isPurchased={p.isPurchased}
                isOpen={openItemId === p.id}
                currentUserName={user.name}
                onOpen={setOpenItemId}
                onClose={handleCloseItem}
                onToggle={toggleProduct}
                onEdit={openEditProduct}
                onDelete={deleteProduct}
                onClick={handleShowDetails}
              />
            ))}
            {pendingAddName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', px: '14px', height: 72, mb: '6px', borderRadius: '14px', bgcolor: 'background.paper', opacity: 0.6, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <CircularProgress size={22} sx={{ color: 'primary.main', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingAddName}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', ml: 'auto', flexShrink: 0 }}>{t('adding')}</Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* FAB - Add Product Button (show when: has items, or on purchased tab, or products exist but filtered) */}
      {(items.length > 0 || filter === 'purchased' || (pending.length + purchased.length) > 0) && (
        <AddProductFab
          itemCount={items.length}
          fabPosition={fabPosition}
          isDragging={isDragging}
          onAddProduct={() => setShowAdd(true)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Product Modals */}
      <AddProductModal
        isOpen={showAdd}
        newProduct={newProduct}
        error={addError}
        onClose={closeAddModal}
        onAdd={handleAdd}
        onUpdateField={updateNewProductField}
        onIncrement={() => incrementQuantity('new')}
        onDecrement={() => decrementQuantity('new')}
      />

      <EditProductModal
        product={showEdit}
        hasChanges={hasProductChanges}
        onClose={closeEditProduct}
        onSave={saveEditedProduct}
        onUpdateField={updateEditProductField}
        onIncrement={() => incrementQuantity('edit')}
        onDecrement={() => decrementQuantity('edit')}
      />

      <ProductDetailsModal
        product={showDetails}
        currentUserName={user.name}
        onClose={() => setShowDetails(null)}
      />

      {/* List Modals */}
      <InviteModal
        isOpen={showInvite}
        list={list}
        onClose={() => setShowInvite(false)}
        showToast={showToast}
      />

      <MembersModal
        isOpen={showMembers}
        list={list}
        members={allMembers}
        isOwner={isOwner}
        onClose={() => setShowMembers(false)}
        onRemoveMember={removeMember}
        onLeaveGroup={leaveList}
        onlineUserIds={onlineUserIds}
        currentUserId={user.id}
      />

      <ShareListModal
        isOpen={showShareList}
        list={list}
        pendingProducts={pending}
        onClose={() => setShowShareList(false)}
        showToast={showToast}
      />

      <EditListModal
        isOpen={showEditList}
        list={list}
        editData={editListData}
        hasChanges={hasListChanges}
        onClose={() => setShowEditList(false)}
        onSave={saveListChanges}
        onUpdateData={setEditListData}
        onConvertToGroup={!list.isGroup ? (password: string) => {
          onUpdateList({ ...list, isGroup: true, password });
          setShowEditList(false);
        } : undefined}
      />

      {/* Confirm Modals */}
      {confirmDeleteList && (
        <ConfirmModal
          title={list.isGroup ? t('deleteGroupTitle') : t('deleteListTitle')}
          message={`${t('delete')} "${list.name}"?\n${t('deleteConfirmMessage')}`}
          confirmText={t('delete')}
          onConfirm={handleDeleteList}
          onCancel={() => setConfirmDeleteList(false)}
        />
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      {/* Celebration - all products purchased */}
      {showCelebration && <CelebrationOverlay />}

      {/* Duplicate Product Dialog */}
      {duplicateProduct && (
        <Modal title={t('productExists')} onClose={handleDuplicateCancel}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 2.5, lineHeight: 1.6 }}>
            {t('productExistsMessage')
              .replace('{name}', duplicateProduct.existing.name)
              .replace('{quantity}', String(duplicateProduct.existing.quantity))
              .replace('{unit}', duplicateProduct.existing.unit)}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button variant="contained" fullWidth onClick={handleDuplicateIncreaseQuantity} sx={{ py: 1.25 }}>
              {t('increaseQuantity')}
            </Button>
            <Button variant="outlined" fullWidth onClick={handleDuplicateAddNew} sx={{ py: 1.25 }}>
              {t('addAnyway')}
            </Button>
          </Box>
        </Modal>
      )}
    </Box>
  );
});

ListComponent.displayName = 'ListComponent';
