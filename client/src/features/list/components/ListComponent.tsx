import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Chip, keyframes } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import type { Product, List, User, ToastType } from '../../../global/types';
import { ConfirmModal, Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { authApi, productsApi } from '../../../services/api';
import { useList } from '../hooks/useList';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { haptic } from '../../../global/helpers';

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

const celebText = keyframes`
  0% { transform: scale(0) rotate(-10deg); opacity: 0; }
  40% { transform: scale(1.15) rotate(3deg); opacity: 1; }
  60% { transform: scale(0.95) rotate(-2deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const celebFade = keyframes`
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
`;

const COLORS = ['#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#22C55E', '#3B82F6', '#06B6D4', '#FBBF24', '#A78BFA', '#34D399'];
const EMOJIS = ['🎉', '✨', '⭐', '🛒', '✅', '🎊', '🥳', '💪', '🏆', '👏'];

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

      {/* טקסט מרכזי */}
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        animation: `${celebText} 0.6s ease-out 0.2s both, ${celebFade} 3s ease-out forwards`,
      }}>
        <Typography sx={{ fontSize: 48, lineHeight: 1 }}>🎉</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#22C55E', textShadow: '0 2px 8px rgba(34,197,94,0.3)', mt: 0.5 }}>
          ✓
        </Typography>
      </Box>

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

// ===== כרטיס אפשרות ניקוי =====
const clearCardSx = (rgb: string) => ({
  display: 'flex', alignItems: 'center', gap: 2,
  p: 2, borderRadius: '14px',
  border: '1.5px solid',
  borderColor: `rgba(${rgb},0.2)`,
  bgcolor: `rgba(${rgb},0.04)`,
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:active': { transform: 'scale(0.98)', bgcolor: `rgba(${rgb},0.08)` }
});

const clearIconSx = (rgb: string) => ({
  width: 44, height: 44, borderRadius: '12px',
  bgcolor: `rgba(${rgb},0.1)`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
});

const CLEAR_OPTIONS = [
  { filter: 'all' as const, rgb: '239,68,68', hex: '#EF4444', Icon: DeleteSweepIcon, label: 'clearAll' as const, desc: 'clearAllDesc' as const },
  { filter: 'purchased' as const, rgb: '34,197,94', hex: '#22C55E', Icon: CheckCircleOutlineIcon, label: 'clearPurchased' as const, desc: 'clearPurchasedDesc' as const },
  { filter: 'pending' as const, rgb: '245,158,11', hex: '#F59E0B', Icon: RemoveShoppingCartIcon, label: 'clearPending' as const, desc: 'clearPendingDesc' as const },
] as const;

const ClearListModal = memo(({ pendingCount, purchasedCount, onClear, onClose }: {
  pendingCount: number;
  purchasedCount: number;
  onClear: (filter: 'all' | 'purchased' | 'pending') => void;
  onClose: () => void;
}) => {
  const { t } = useSettings();
  const counts = { all: pendingCount + purchasedCount, purchased: purchasedCount, pending: pendingCount };

  return (
    <Modal title={t('clearList')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {CLEAR_OPTIONS.map(({ filter, rgb, hex, Icon, label, desc }) =>
          counts[filter] > 0 && (
            <Box key={filter} onClick={() => onClear(filter)} sx={clearCardSx(rgb)}>
              <Box sx={clearIconSx(rgb)}>
                <Icon sx={{ color: hex, fontSize: 24 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: hex }}>
                  {t(label)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  {t(desc)} ({counts[filter]})
                </Typography>
              </Box>
            </Box>
          )
        )}
      </Box>
    </Modal>
  );
});
ClearListModal.displayName = 'ClearListModal';

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

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedProducts(new Set());
  }, []);

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

  const handleLongPress = useCallback((productId: string) => {
    haptic('medium');
    setSelectionMode(true);
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  }, []);

  // איפוס סינון קטגוריה כשמחליפים טאב (useEffect כי filter הוא prop חיצוני)
  useEffect(() => { setCategoryFilter(null); }, [filter]);

  // ספירת מוצרים לפי קטגוריה (חישוב חד-פעמי, לא בכל chip)
  const { activeCategories, categoryCounts } = useMemo(() => {
    const source = filter === 'purchased' ? purchased : filter === 'pending' ? pending : [...pending, ...purchased];
    const counts = new Map<string, number>();
    for (const p of source) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    return { activeCategories: Array.from(counts.keys()), categoryCounts: counts };
  }, [filter, pending, purchased]);

  // איפוס קטגוריה אם נגמרו מוצרים בה (למשל אחרי סימון כנקנה)
  useEffect(() => {
    if (categoryFilter && !activeCategories.includes(categoryFilter)) {
      setCategoryFilter(null);
    }
  }, [categoryFilter, activeCategories]);

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
      setSelectedProducts(prev => {
        const next = new Set(prev);
        if (next.has(product.id)) next.delete(product.id);
        else next.add(product.id);
        return next;
      });
    } else {
      handleShowDetails(product);
    }
  }, [selectionMode, handleShowDetails]);

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
        onResetList={withExitSelection(handleResetList)!}
        hasPurchased={purchased.length > 0}
        hasProducts={pending.length + purchased.length > 0}
        onLeave={!isOwner && list.isGroup ? withExitSelection(leaveList) : undefined}
      />

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
        }}
        onClick={handleCloseItem}
        role="main"
        aria-label={list.name}
      >
        {/* Swipe Hint */}
        {showHint && items.length > 0 && (
          <SwipeHint onDismiss={dismissHint} />
        )}

        {/* סינון לפי קטגוריה */}
        {items.length > 0 && activeCategories.length > 1 && (
          <Box sx={{
            display: 'flex', gap: 0.75, mb: 1.5, overflowX: 'auto', pb: 0.5,
            mx: -1.5, px: 1.5,
            '&::-webkit-scrollbar': { display: 'none' },
            maskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
            WebkitMaskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
          }}>
            <Chip
              label={`${t('all')} (${items.length})`}
              size="small"
              onClick={() => setCategoryFilter(null)}
              sx={{
                fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
                bgcolor: !categoryFilter ? 'primary.main' : 'action.hover',
                color: !categoryFilter ? 'white' : 'text.primary',
                boxShadow: !categoryFilter ? '0 2px 8px rgba(20,184,166,0.3)' : 'none',
                transition: 'all 0.2s ease',
                '&:active': { transform: 'scale(0.95)' },
              }}
            />
            {activeCategories.map(cat => {
              const count = categoryCounts.get(cat) || 0;
              const icon = CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || '📦';
              const key = CATEGORY_TRANSLATION_KEYS[cat as keyof typeof CATEGORY_TRANSLATION_KEYS];
              const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6B7280';
              const isActive = categoryFilter === cat;
              return (
                <Chip
                  key={cat}
                  label={`${icon} ${key ? t(key) : cat} (${count})`}
                  size="small"
                  onClick={() => setCategoryFilter(isActive ? null : cat)}
                  sx={{
                    fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
                    bgcolor: isActive ? color : `${color}1F`,
                    color: isActive ? 'white' : color,
                    border: '1px solid',
                    borderColor: isActive ? color : `${color}55`,
                    boxShadow: isActive ? `0 2px 8px ${color}55` : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: isActive ? color : `${color}30` },
                    '&:active': { transform: 'scale(0.95)' },
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Products List or Empty State */}
        {items.length === 0 ? (
          <EmptyState filter={filter} totalProducts={pending.length + purchased.length} hasSearch={!!search} onAddProduct={() => setShowAdd(true)} onClearPurchased={() => handleClearList('purchased')} />
        ) : filteredItems.length === 0 && categoryFilter ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontSize: 40, mb: 1 }}>{CATEGORY_ICONS[categoryFilter as keyof typeof CATEGORY_ICONS] || '📦'}</Typography>
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
        <Box sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
          pb: 'max(16px, env(safe-area-inset-bottom))',
          px: 2, pt: 1.5,
          bgcolor: 'background.paper',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          borderRadius: '20px 20px 0 0',
          animation: 'slideUp 0.25s ease-out',
          '@keyframes slideUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        }}>
          {(() => {
            const allSelected = selectedProducts.size === filteredItems.length && filteredItems.length > 0;
            return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
              <Box
                onClick={exitSelectionMode}
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  '&:active': { transform: 'scale(0.9)', bgcolor: 'action.selected' },
                  transition: 'all 0.15s',
                }}
              >
                <Typography sx={{ fontSize: 18, color: 'text.secondary', lineHeight: 1 }}>✕</Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                <Typography component="span" sx={{ color: 'primary.main', fontWeight: 800, fontSize: 17 }}>
                  {selectedProducts.size}
                </Typography>
                <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 13 }}>
                  {` מתוך ${filteredItems.length}`}
                </Typography>
              </Typography>
              <Box
                onClick={() => {
                  haptic('light');
                  if (allSelected) setSelectedProducts(new Set());
                  else setSelectedProducts(new Set(filteredItems.map(p => p.id)));
                }}
                sx={{
                  height: 36, px: 2,
                  borderRadius: '18px',
                  bgcolor: allSelected ? 'primary.main' : 'rgba(20,184,166,0.1)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  '&:active': { transform: 'scale(0.95)' },
                  transition: 'all 0.2s',
                }}
              >
                <Typography sx={{ fontSize: 16, color: allSelected ? 'white' : 'primary.main', lineHeight: 1 }}>
                  {allSelected ? '☑' : '☐'}
                </Typography>
                <Typography sx={{
                  fontSize: 13, fontWeight: 700,
                  color: allSelected ? 'white' : 'primary.main',
                }}>
                  בחר הכל
                </Typography>
              </Box>
            </Box>
            );
          })()}
          <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
            {/* כפתור ראשי - סמן/החזר, בצבע מתאים */}
            {filter === 'purchased' ? (
              <Button
                variant="contained"
                disabled={selectedProducts.size === 0}
                onClick={() => {
                  haptic('medium');
                  const ids = Array.from(selectedProducts);
                  const count = ids.length;
                  exitSelectionMode();
                  onUpdateProductsForList(list.id, (current) =>
                    current.map(p => ids.includes(p.id) ? { ...p, isPurchased: false } : p)
                  );
                  showToast(`${count} ${t('bulkReturnedToList')}`);
                  for (const id of ids) {
                    productsApi.updateProduct(list.id, id, { isPurchased: false }).catch(() => {});
                  }
                }}
                sx={{
                  flex: 1, borderRadius: '14px', textTransform: 'none', fontWeight: 700,
                  fontSize: 14, py: 1.25, color: 'white !important',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706) !important',
                  boxShadow: '0 4px 14px rgba(245,158,11,0.45)',
                  '&:hover': { background: 'linear-gradient(135deg, #D97706, #B45309) !important', boxShadow: '0 6px 18px rgba(245,158,11,0.55)' },
                  '&.Mui-disabled': {
                    background: 'linear-gradient(135deg, #F59E0B, #D97706) !important',
                    color: 'white !important',
                    opacity: 0.55,
                  },
                }}
              >
                {t('returnToList')}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={selectedProducts.size === 0}
                onClick={() => {
                  haptic('medium');
                  const ids = Array.from(selectedProducts);
                  const count = ids.length;
                  exitSelectionMode();
                  onUpdateProductsForList(list.id, (current) =>
                    current.map(p => ids.includes(p.id) ? { ...p, isPurchased: true } : p)
                  );
                  showToast(`${count} ${t('bulkMarkedPurchased')}`);
                  for (const id of ids) {
                    productsApi.updateProduct(list.id, id, { isPurchased: true }).catch(() => {});
                  }
                }}
                sx={{
                  flex: 1, borderRadius: '14px', textTransform: 'none', fontWeight: 700,
                  fontSize: 14, py: 1.25, color: 'white !important',
                  background: 'linear-gradient(135deg, #22C55E, #16A34A) !important',
                  boxShadow: '0 4px 14px rgba(34,197,94,0.45)',
                  '&:hover': { background: 'linear-gradient(135deg, #16A34A, #15803D) !important', boxShadow: '0 6px 18px rgba(34,197,94,0.55)' },
                  '&.Mui-disabled': {
                    background: 'linear-gradient(135deg, #22C55E, #16A34A) !important',
                    color: 'white !important',
                    opacity: 0.55,
                  },
                }}
              >
                {t('markPurchased')}
              </Button>
            )}
            {/* כפתור מחיקה - בצד שמאל (בדום אחרון = שמאל ב-RTL), בלי אייקון */}
            <Button
              disabled={selectedProducts.size === 0}
              onClick={() => {
                haptic('medium');
                const ids = Array.from(selectedProducts);
                const count = ids.length;
                const deletedProducts = list.products.filter((p: Product) => ids.includes(p.id));
                exitSelectionMode();
                onUpdateProductsForList(list.id, (current) =>
                  current.filter(p => !ids.includes(p.id))
                );
                for (const id of ids) {
                  productsApi.deleteProduct(list.id, id).catch(() => {});
                }
                showToast(`${count} ${t('bulkDeleted')}`, 'success', async () => {
                  const tempProducts = deletedProducts.map(p => ({ ...p, id: `temp-undo-${Date.now()}-${Math.random()}` }));
                  onUpdateProductsForList(list.id, (current) => [...current, ...tempProducts]);
                  for (let i = 0; i < deletedProducts.length; i++) {
                    const p = deletedProducts[i];
                    const tempId = tempProducts[i].id;
                    try {
                      const serverProduct = await productsApi.addProduct(list.id, {
                        name: p.name, quantity: p.quantity, unit: p.unit, category: p.category,
                      });
                      onUpdateProductsForList(list.id, (current) =>
                        current.map(c => c.id === tempId ? { ...c, id: serverProduct.id } : c)
                      );
                    } catch { /* ignore */ }
                  }
                });
              }}
              sx={{
                flex: 1, borderRadius: '14px', py: 1.25,
                fontSize: 14, fontWeight: 700, textTransform: 'none',
                bgcolor: 'rgba(239,68,68,0.08)',
                color: '#EF4444',
                border: '1.5px solid rgba(239,68,68,0.3)',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
                '&.Mui-disabled': { opacity: 0.4, color: '#EF4444' },
              }}
            >
              {t('delete')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Clear List Modal */}
      {showClearList && (
        <ClearListModal
          pendingCount={pending.length}
          purchasedCount={purchased.length}
          onClear={handleClearList}
          onClose={() => setShowClearList(false)}
        />
      )}

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
