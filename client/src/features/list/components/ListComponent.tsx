import { memo } from 'react';
import { Box } from '@mui/material';
import type { Product, List, User } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { useList } from '../hooks/useList';

// ===== Sub-components =====
import { ListHeader } from './ListHeader';
import { EmptyState } from './EmptyState';
import { SwipeHint } from './SwipeHint';
import { SwipeItem } from './SwipeItem';
import { AddProductFab } from './AddProductFab';
import { AddProductModal, EditProductModal, ProductDetailsModal } from './ProductModals';
import { InviteModal, MembersModal, ShareListModal, EditListModal } from './ListModals';

// ===== Props Interface =====
interface ListPageProps {
  list: List;
  user: User;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onUpdateListLocal: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
  onlineUserIds?: Set<string>;
}

// ===== Main Component =====
export const ListComponent = memo(({ list, onBack, onUpdateList, onUpdateListLocal, onLeaveList, onDeleteList, showToast, user, onlineUserIds }: ListPageProps) => {
  const { t } = useSettings();

  const {
    // State
    filter, search, showAdd, showEdit, showDetails, showInvite,
    showMembers, showShareList, showEditList, editListData,
    confirmDeleteList, confirm, newProduct, openItemId, showHint, addError,
    fabPosition, isDragging,
    // Computed
    pending, purchased, items, allMembers, isOwner, hasProductChanges, hasListChanges,
    // Setters
    setFilter, setSearch, setShowAdd, setShowDetails,
    setShowInvite, setShowMembers, setShowShareList, setShowEditList,
    setEditListData, setConfirmDeleteList, setConfirm, setOpenItemId,
    // Handlers
    handleDragStart, handleDragMove, handleDragEnd, dismissHint,
    handleAdd, handleQuickAdd, handleEditList, saveListChanges, handleDeleteList,
    removeMember, leaveList,
    toggleProduct, deleteProduct, saveEditedProduct, openEditProduct, closeEditProduct,
    updateNewProductField, updateEditProductField, incrementQuantity,
    decrementQuantity, closeAddModal
  } = useList({
    list, user, onUpdateList, onUpdateListLocal, onLeaveList, onDeleteList, onBack, showToast
  });

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
        onShareList={() => setShowShareList(true)}
        onShowMembers={() => setShowMembers(true)}
        onShowInvite={() => setShowInvite(true)}
        onQuickAdd={handleQuickAdd}
        onlineUserIds={onlineUserIds}
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
        onClick={() => setOpenItemId(null)}
        role="main"
        aria-label={list.name}
      >
        {/* Swipe Hint */}
        {showHint && items.length > 0 && (
          <SwipeHint onDismiss={dismissHint} />
        )}

        {/* Products List or Empty State */}
        {items.length === 0 ? (
          <EmptyState filter={filter} totalProducts={pending.length + purchased.length} onAddProduct={() => setShowAdd(true)} />
        ) : (
          items.map((p: Product) => (
            <SwipeItem
              key={p.id}
              product={p}
              isPurchased={p.isPurchased}
              isOpen={openItemId === p.id}
              currentUserName={user.name}
              onOpen={() => setOpenItemId(p.id)}
              onClose={() => setOpenItemId(null)}
              onToggle={() => toggleProduct(p.id)}
              onEdit={() => openEditProduct(p)}
              onDelete={() => deleteProduct(p.id)}
              onClick={() => { setShowDetails(p); dismissHint(); }}
            />
          ))
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
        isOwner={isOwner}
        onClose={() => setShowEditList(false)}
        onSave={saveListChanges}
        onDelete={() => { setShowEditList(false); setConfirmDeleteList(true); }}
        onUpdateData={setEditListData}
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
    </Box>
  );
});

ListComponent.displayName = 'ListComponent';
