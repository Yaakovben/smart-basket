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
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
}

// ===== Main Component =====
export const ListComponent = memo(({ list, onBack, onUpdateList, onLeaveList, onDeleteList, showToast, user }: ListPageProps) => {
  const { t } = useSettings();

  const {
    // State
    filter, search, showAdd, showEdit, showDetails, showInvite,
    showMembers, showShareList, showEditList, editListData,
    confirmDeleteList, confirm, newProduct, openItemId, showHint, addError,
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
        search={search}
        filter={filter}
        pendingCount={pending.length}
        purchasedCount={purchased.length}
        allMembers={allMembers}
        isOwner={isOwner}
        onBack={onBack}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onEditList={handleEditList}
        onShareList={() => setShowShareList(true)}
        onShowMembers={() => setShowMembers(true)}
        onShowInvite={() => setShowInvite(true)}
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
          <EmptyState filter={filter} onAddProduct={() => setShowAdd(true)} />
        ) : (
          items.map((p: Product) => (
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
          ))
        )}
      </Box>

      {/* FAB - Add Product Button */}
      {(items.length > 0 || filter === 'purchased') && (
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
        onClose={() => setShowEdit(null)}
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
        onClose={() => setShowEditList(false)}
        onSave={saveListChanges}
        onDelete={() => { setShowEditList(false); setConfirmDeleteList(true); }}
        onUpdateData={setEditListData}
      />

      {/* Confirm Modals */}
      {confirmDeleteList && (
        <ConfirmModal
          title={list.isGroup ? t('deleteGroup') : t('deleteList')}
          message={`${t('delete')} "${list.name}"?`}
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
