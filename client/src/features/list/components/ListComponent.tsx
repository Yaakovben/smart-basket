import { memo, useRef, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Button, keyframes } from '@mui/material';
import type { Product, List, User } from '../../../global/types';
import { ConfirmModal, Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { authApi } from '../../../services/api';
import { useList } from '../hooks/useList';

// ===== אנימציית חגיגה =====
const float = keyframes`
  0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(-120vh) rotate(720deg) scale(0); opacity: 0; }
`;

const CELEBRATION_COLORS = ['#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E', '#3B82F6', '#EF4444', '#06B6D4'];

const CelebrationOverlay = memo(() => {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.8}s`,
      duration: `${1.5 + Math.random() * 1.5}s`,
      color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
      size: 6 + Math.random() * 6,
      shape: i % 3, // 0=circle, 1=square, 2=rectangle
    })),
  []);

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map(p => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            bottom: '-10px',
            left: p.left,
            width: p.shape === 2 ? p.size * 1.5 : p.size,
            height: p.shape === 2 ? p.size * 0.6 : p.size,
            bgcolor: p.color,
            borderRadius: p.shape === 0 ? '50%' : '2px',
            animation: `${float} ${p.duration} ${p.delay} ease-out forwards`,
          }}
        />
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
        onConvertToGroup={!list.isGroup ? () => {
          onUpdateList({ ...list, isGroup: true, password: '0000' });
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
