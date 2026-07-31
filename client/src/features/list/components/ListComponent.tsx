import { memo, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { Box, Typography, Button } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { Product, List, User, ToastType } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { authApi } from '../../../services/api';
import { useList } from '../hooks/useList';
import { useProductSelection } from '../hooks/useProductSelection';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PULL_MAX } from '../helpers/list-helpers';
import { CATEGORY_ICONS } from '../../../global/constants';

// ===== קומפוננטות משנה =====
import { ListHeader } from './ListHeader';
import { EmptyState } from './EmptyState';
import { SwipeHint } from './SwipeHint';
import { LongPressHint } from './LongPressHint';
import { SwipeItem } from './SwipeItem';
import { AddProductFab } from './AddProductFab';
import { CelebrationOverlay } from './CelebrationOverlay';
import { ClearListModal } from './ClearListModal';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { CategoryFilterChips } from './CategoryFilterChips';
import { SelectionActionBar } from './SelectionActionBar';
import { DuplicateProductModal } from './DuplicateProductModal';
import { AddProductModal } from './product-modals/AddProductModal';
// prefetch מיידי של QRScanner כשנכנסים לרשימה - כך כשהמשתמש לוחץ "סרוק ברקוד"
// ב-AddProductModal ה-chunk כבר נטען ואין עיכוב
import('../../../global/components/QRScanner').catch(() => {});
// טעינה עצלה - נדרשת רק כשבאמת פותחים "סרוק רשימה" מהתפריט, לא בכל טעינת הרשימה
const ScanListPhoto = lazy(() => import('./product-modals/ScanListPhoto').then(m => ({ default: m.ScanListPhoto })));
import { EditProductModal } from './product-modals/EditProductModal';
import { ProductDetailsModal } from './product-modals/ProductDetailsModal';
import { InviteModal } from './modals/InviteModal';
import { MembersModal } from './modals/MembersModal';
import { ShareListModal } from './modals/ShareListModal';
import { EditListModal } from './modals/EditListModal';

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
  showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  onlineUserIds?: Set<string>;
}

// ===== קומפוננטה ראשית =====
export const ListComponent = memo(({ list, onBack, onUpdateList, onUpdateListLocal, onUpdateProductsForList, onLeaveList, onDeleteList, showToast, user, onlineUserIds }: ListPageProps) => {
  const { t, settings, toggleGroupMute, isGroupMuted, updateNotifications } = useSettings();
  const isMuteToggling = useRef(false);

  const {
    filter, search, showAdd, showEdit, showDetails, showInvite,
    showMembers, showShareList, showEditList, editListData,
    confirmDeleteList, confirm, newProduct, openItemId, showHint, addError,
    refreshing,
    fabPosition, showFab, isDragging,
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
    refreshList, showClearList, setShowClearList, handleClearList, handleResetList, showCelebration
  } = useList({
    list, user, onUpdateList, onUpdateListLocal, onUpdateProductsForList, onLeaveList, onDeleteList, onBack, showToast
  });

  const {
    selectedProducts, selectionMode, exitSelectionMode, handleLongPress,
    toggleSelected, selectAll, clearSelection, bulkSetPurchased, bulkDelete,
  } = useProductSelection({ list, onUpdateProductsForList, showToast, t });

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // סריקת רשימה מהדף (OCR) - נפתח מתפריט "עוד" בכותרת (ליד השיתוף)
  const [showScanList, setShowScanList] = useState(false);
  const [scanListMounted, setScanListMounted] = useState(false);
  // הוספה ברצף (לא במקביל) כדי לא לפגוע בבדיקת הכפילויות של handleQuickAdd,
  // שמסתמכת על המוצרים שכבר נוספו בלולאה הזו.
  const handleScanListConfirm = useCallback(async (names: string[]) => {
    for (const name of names) {
      await handleQuickAdd(name);
    }
  }, [handleQuickAdd]);

  const { pullDistance, pullActiveRef, handlePullStart, handlePullMove, handlePullEnd } = usePullToRefresh(refreshList);

  // עוטף פונקציה: אם במצב בחירה מרובה — יוצא ממנו ואז מפעיל את הפעולה
  function withExitSelection<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void;
  function withExitSelection<A extends unknown[]>(fn: ((...args: A) => void) | undefined): ((...args: A) => void) | undefined;
  function withExitSelection<A extends unknown[]>(fn: ((...args: A) => void) | undefined): ((...args: A) => void) | undefined {
    if (!fn) return undefined;
    return (...args: A) => {
      if (selectionMode) exitSelectionMode();
      fn(...args);
    };
  }

  const handleCloseItem = useCallback((e?: React.MouseEvent) => {
    setOpenItemId(null);
    // בבחירה מרובה - לחיצה על אזור ריק (לא על פריט) מבטלת את הבחירה
    if (selectedProducts.size > 0 && e && e.target === e.currentTarget) {
      exitSelectionMode();
    }
  }, [setOpenItemId, selectedProducts.size, exitSelectionMode]);
  const handleShowDetails = useCallback((product: Product) => {
    setShowDetails(product);
    dismissHint();
  }, [setShowDetails, dismissHint]);

  // ספירת מוצרים לפי קטגוריה (חישוב חד-פעמי, לא בכל chip)
  const { activeCategories, categoryCounts } = useMemo(() => {
    const source = filter === 'purchased' ? purchased : filter === 'pending' ? pending : [...pending, ...purchased];
    const counts = new Map<string, number>();
    for (const p of source) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    return { activeCategories: Array.from(counts.keys()), categoryCounts: counts };
  }, [filter, pending, purchased]);

  // Derived state: categoryFilter תקף רק אם הקטגוריה עדיין פעילה תחת ה-filter הנוכחי.
  // במקום שני useEffect שמאפסים את ה-state (setState-in-effect אסור לפי react-compiler),
  // משתמשים בערך נגזר לתצוגה. ה-state עצמו יתאפס רק דרך handler מפורש.
  const effectiveCategoryFilter = categoryFilter && activeCategories.includes(categoryFilter)
    ? categoryFilter
    : null;

  // סינון מוצרים לפי קטגוריה
  const filteredItems = useMemo(() => {
    if (!categoryFilter) return items;
    return items.filter(p => p.category === categoryFilter);
  }, [items, categoryFilter]);

  // הצעות מוצרים מהרשימה הנוכחית (שמות ייחודיים)
  const productSuggestions = useMemo(() => {
    const all = [...pending, ...purchased];
    const seen = new Set<string>();
    return all.reduce<{ name: string; category: Product['category']; unit: Product['unit'] }[]>((acc, p) => {
      const key = p.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); acc.push({ name: p.name, category: p.category, unit: p.unit }); }
      return acc;
    }, []);
  }, [pending, purchased]);

  const handleProductClick = useCallback((product: Product) => {
    if (selectionMode) {
      toggleSelected(product.id);
    } else {
      handleShowDetails(product);
    }
  }, [selectionMode, toggleSelected, handleShowDetails]);

  const allSelected = selectedProducts.size === filteredItems.length && filteredItems.length > 0;

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
        onBack={withExitSelection(onBack)}
        onFilterChange={withExitSelection(setFilter)!}
        onSearchChange={setSearch}
        onEditList={withExitSelection(handleEditList)!}
        onDeleteList={withExitSelection(() => setConfirmDeleteList(true))!}
        onToggleMute={() => {
          if (isMuteToggling.current) return;
          isMuteToggling.current = true;
          toggleGroupMute(list.id);
          authApi.toggleMuteGroup(list.id)
            .catch(() => { toggleGroupMute(list.id); showToast(t('errorOccurred'), 'error'); })
            .finally(() => { isMuteToggling.current = false; });
        }}
        isMuted={isGroupMuted(list.id)}
        mainNotificationsOff={!settings.notifications.enabled}
        onShareList={withExitSelection(() => setShowShareList(true))!}
        onShowMembers={withExitSelection(() => setShowMembers(true))!}
        onShowInvite={withExitSelection(() => setShowInvite(true))!}
        onQuickAdd={withExitSelection(handleQuickAdd)!}
        onlineUserIds={onlineUserIds}
        onRefresh={refreshList}
        refreshing={refreshing}
        onClearList={withExitSelection(() => setShowClearList(true))!}
        hasProducts={pending.length + purchased.length > 0}
        onLeave={!isOwner && list.isGroup ? withExitSelection(leaveList) : undefined}
        onScanList={withExitSelection(() => { setScanListMounted(true); setShowScanList(true); })!}
      />

      {scanListMounted && (
        <Suspense fallback={null}>
          <ScanListPhoto
            open={showScanList}
            onClose={() => setShowScanList(false)}
            onConfirm={handleScanListConfirm}
          />
        </Suspense>
      )}

      {/* pullActiveRef.current: ref מכוון בכוונה (לא state) כדי להימנע מ-render נוסף
          במגע - עודכן סינכרונית לפני setPullDistance באותו handler, אז תמיד עקבי
          לרגע הרינדור הבא. ראה usePullToRefresh.ts. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} pullActive={pullActiveRef.current} />

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: { xs: 1.5, sm: 2.5 },
          pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 'calc(90px + env(safe-area-inset-bottom))' },
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position',
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, PULL_MAX)}px)` : 'none',
          // pullActiveRef: ראה הערה למעלה ליד PullToRefreshIndicator
          // eslint-disable-next-line react-hooks/refs
          transition: pullActiveRef.current ? 'none' : 'transform 0.2s ease',
        }}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        onClick={handleCloseItem}
        role="main"
        aria-label={list.name}
      >
        {/* Swipe Hint */}
        {showHint && items.length > 0 && (
          <SwipeHint onDismiss={dismissHint} />
        )}

        {/* רמז עדין על לחיצה ארוכה - מוצג רק אחרי שהסרת את רמז ההחלקה ויש פריטים */}
        {!showHint && items.length > 0 && <LongPressHint />}

        {/* סינון לפי קטגוריה */}
        {items.length > 0 && activeCategories.length > 1 && (
          <CategoryFilterChips
            totalCount={items.length}
            activeCategories={activeCategories}
            categoryCounts={categoryCounts}
            effectiveCategoryFilter={effectiveCategoryFilter}
            onSelectCategory={setCategoryFilter}
          />
        )}

        {/* Products List or Empty State */}
        {items.length === 0 ? (
          <EmptyState filter={filter} totalProducts={pending.length + purchased.length} hasSearch={!!search} onAddProduct={() => setShowAdd(true)} onClearPurchased={() => handleClearList('purchased')} />
        ) : filteredItems.length === 0 && effectiveCategoryFilter ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 40, mb: 1 }}>{CATEGORY_ICONS[effectiveCategoryFilter as keyof typeof CATEGORY_ICONS] || '📦'}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>{t('noProductsInCategory')}</Typography>
            <Button size="small" onClick={() => setCategoryFilter(null)} sx={{ textTransform: 'none', fontSize: 13 }}>{t('showAll')}</Button>
          </Box>
        ) : (
          <>
            {filteredItems.map((p: Product) => (
              <SwipeItem
                key={p.id}
                product={p}
                isPurchased={p.isPurchased}
                isOpen={openItemId === p.id}
                isSelected={selectedProducts.has(p.id)}
                selectionMode={selectionMode}
                currentUserName={user.name}
                searchTerm={search}
                onOpen={setOpenItemId}
                onClose={handleCloseItem}
                onToggle={toggleProduct}
                onEdit={openEditProduct}
                onDelete={deleteProduct}
                onClick={handleProductClick}
                onLongPress={handleLongPress}
                onExitSelectionMode={exitSelectionMode}
              />
            ))}
            {filter === 'purchased' && filteredItems.length > 0 && (
              <Button
                variant="outlined"
                onClick={() => handleClearList('purchased')}
                startIcon={<DeleteSweepIcon sx={{ fontSize: 18 }} />}
                sx={{
                  mt: 3, mb: 1, mx: 'auto', display: 'flex', gap: 1,
                  color: 'error.main', borderColor: 'rgba(239,68,68,0.3)',
                  fontSize: 13, fontWeight: 600, textTransform: 'none',
                  borderRadius: '12px', px: 3, py: 1,
                  '&:hover': { borderColor: 'error.main', bgcolor: 'rgba(239,68,68,0.04)' },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                {t('clearPurchased')}
              </Button>
            )}
          </>
        )}
      </Box>

      {/* FAB - Add Product Button */}
      {showFab && (
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
        suggestions={productSuggestions}
        onClose={closeAddModal}
        onAdd={handleAdd}
        onUpdateField={updateNewProductField}
        onIncrement={() => incrementQuantity('new')}
        onDecrement={() => decrementQuantity('new')}
      />

      <EditProductModal
        product={showEdit}
        hasChanges={hasProductChanges}
        saving={false}
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
        saving={false}
        onClose={() => setShowEditList(false)}
        onSave={saveListChanges}
        onUpdateData={setEditListData}
        onConvertToGroup={!list.isGroup ? async (password: string) => {
          try {
            await onUpdateList({ ...list, isGroup: true, password });
            setShowEditList(false);
          } catch {
            showToast(t('errorOccurred'), 'error');
          }
        } : undefined}
        onConvertToPrivate={list.isGroup && list.members.length === 0 ? async () => {
          try {
            if (isGroupMuted(list.id)) {
              updateNotifications({ mutedGroupIds: settings.notifications.mutedGroupIds.filter(id => id !== list.id) });
            }
            await onUpdateList({ ...list, isGroup: false, password: null });
            setShowEditList(false);
          } catch {
            showToast(t('errorOccurred'), 'error');
          }
        } : undefined}
        onChangePassword={list.isGroup ? async (password: string) => {
          try {
            await onUpdateList({ ...list, password });
            showToast(t('saved'));
          } catch {
            showToast(t('errorOccurred'), 'error');
          }
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

      {/* בר פעולות בחירה מרובה */}
      {selectionMode && (
        <SelectionActionBar
          filter={filter}
          selectedCount={selectedProducts.size}
          totalCount={filteredItems.length}
          allSelected={allSelected}
          onExit={exitSelectionMode}
          onToggleSelectAll={() => allSelected ? clearSelection() : selectAll(filteredItems.map(p => p.id))}
          onBulkAction={() => bulkSetPurchased(filter !== 'purchased')}
          onDelete={bulkDelete}
        />
      )}

      {/* Clear List Modal */}
      {showClearList && (
        <ClearListModal
          pendingCount={pending.length}
          purchasedCount={purchased.length}
          onClear={handleClearList}
          onReset={handleResetList}
          onClose={() => setShowClearList(false)}
        />
      )}

      {/* Duplicate Product Dialog */}
      {duplicateProduct && (
        <DuplicateProductModal
          duplicateProduct={duplicateProduct}
          onIncreaseQuantity={handleDuplicateIncreaseQuantity}
          onAddNew={handleDuplicateAddNew}
          onCancel={handleDuplicateCancel}
        />
      )}
    </Box>
  );
});

ListComponent.displayName = 'ListComponent';
