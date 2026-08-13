import { useNavigate } from 'react-router-dom';
import { useRef, useEffect, useState, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import type { List } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
// טעינה עצלה: @zxing נטען רק כשהמשתמש בפועל פותח את הסורק, לא בכל טעינת דף הבית
const QRScanner = lazy(() => import('../../../global/components/QRScanner').then(m => ({ default: m.QRScanner })));
import { EditListModal } from '../../list/components/ListModals';
import { useSettings } from '../../../global/context/SettingsContext';
import { useHome } from '../hooks/useHome';
import { useListReorder } from '../hooks/useListReorder';
import { useHomeNotifications } from '../hooks/useHomeNotifications';
import { useHomePushPrompt } from '../hooks/useHomePushPrompt';
import { getTimeGreeting, getTimeEmoji, getWeekdayMessage } from '../helpers/greeting';
import { HomeHeader } from './HomeHeader';
import { HomeMenuSheet } from './HomeMenuSheet';
import { HomeListContent } from './HomeListContent';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import { CreateListModal } from './CreateListModal';
import { JoinGroupModal } from './JoinGroupModal';
import { NotificationsModal } from './NotificationsModal';
import { HomeBottomNav } from './HomeBottomNav';
import { AiAssistantFab } from './AiAssistantFab';
import type { HomePageProps } from '../types/home-types';

export const HomeComponent = memo(({
  lists, listsLoading = false, listsFetchError = false, onSelectList, onCreateList, onDeleteList, onLeaveList, onEditList, onJoinGroup, onLogout, user, showToast,
  persistedNotifications = [], notificationsLoading = false, onMarkPersistedNotificationRead, onClearAllPersistedNotifications
}: HomePageProps) => {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const { t, settings, isGroupMuted, toggleGroupMute, updateNotifications } = useSettings();
  const isDark = settings.theme === 'dark';

  // ברכות וזמן - מחשבים פעם אחת בעת mount ולא בכל render.
  const greeting = useMemo(() => ({
    label: t(getTimeGreeting()),
    emoji: getTimeEmoji(),
    weekdayMsg: getWeekdayMessage(t),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const { showPushPrompt, pushPromptError, pushLoading, handleEnablePush, handleDismissPushPrompt } = useHomePushPrompt();

  // סורק QR להצטרפות — נפתח מתוך JoinModal
  const [showQRScanner, setShowQRScanner] = useState(false);
  // נדלק פעם אחת עם הפתיחה הראשונה ונשאר true - כדי שה-chunk הכבד של
  // הסורק (@zxing) ייטען פעם אחת בלבד וסגירת הדיאלוג לא תפרק/תטען אותו מחדש.
  const [scannerMounted, setScannerMounted] = useState(false);

  // אנימציית סגירה לתפריט "מה תרצה ליצור?" - state בלבד, ה-callback מוגדר
  // אחרי useHome כי הוא תלוי ב-setShowMenu שמגיע משם.
  const [menuClosing, setMenuClosing] = useState(false);

  const {
    tab, search, showMenu, showCreate, showCreateGroup, showJoin,
    showNotifications, confirmLogout, editList, confirmDeleteList,
    newL, joinCode, joinPass, joinError, createError, joiningGroup, joinCooldown, creatingList, savingList,
    userLists, my, groups, display,
    setTab, setSearch, setShowMenu, setShowNotifications, setConfirmLogout,
    setEditList, setConfirmDeleteList, setJoinCode, setJoinPass, setJoinError,
    handleCreate, handleJoin, openOption, closeCreateModal, closeCreateGroupModal,
    closeJoinModal, updateNewListField, saveEditList,
    deleteList
  } = useHome({
    lists, user, onCreateList, onDeleteList, onEditList, onJoinGroup, showToast
  });

  // closeMenu - ממקם כאן כי הוא תלוי ב-setShowMenu שמגיע מ-useHome
  const closeMenu = useCallback(() => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setShowMenu(false);
      setMenuClosing(false);
    }, 160);
  }, [setShowMenu]);

  // ===== אדפטר עבור EditListModal המשותף =====
  const editListOriginal = useRef<List | null>(null);
  if (editList && (!editListOriginal.current || editListOriginal.current.id !== editList.id)) {
    editListOriginal.current = editList;
  }
  if (!editList) editListOriginal.current = null;

  const editListData = editList ? { name: editList.name, icon: editList.icon, color: editList.color } : null;
  const editListHasChanges = !!(editList && editListOriginal.current && (
    editList.name !== editListOriginal.current.name ||
    editList.icon !== editListOriginal.current.icon ||
    editList.color !== editListOriginal.current.color
  ));

  const {
    orderedDisplay, reorderMode, dragIndex, dragOverIndex, cardRefs,
    hasOrderChanges, handleDragStart, handleSaveOrder, handleEnterReorder, handleCancelReorder,
  } = useListReorder(contentRef, display, user, showToast, t);

  // מצב אישור עזיבת רשימה
  const [confirmLeaveList, setConfirmLeaveList] = useState<List | null>(null);

  const handleLeaveList = useCallback(async () => {
    if (!confirmLeaveList || !onLeaveList) return;
    try {
      await onLeaveList(confirmLeaveList.id);
      setConfirmLeaveList(null);
      showToast(t('left'));
    } catch {
      showToast(t('errorOccurred'), 'error');
    }
  }, [confirmLeaveList, onLeaveList, showToast, t]);

  const {
    allNotifications, totalUnreadCount, dismissingNotifications, handleDismissNotification, handleMarkAllRead,
  } = useHomeNotifications(persistedNotifications, onMarkPersistedNotificationRead, onClearAllPersistedNotifications);

  // Ref לשדה סיסמה במודאל הצטרפות
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // פוקוס אוטומטי לשדה סיסמה כשהקוד מושלם
  useEffect(() => {
    if (joinCode.length === 6 && showJoin) {
      passwordInputRef.current?.focus();
    }
  }, [joinCode, showJoin]);

  return (
    <>
    <Box sx={{ height: { xs: '100svh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      <HomeHeader
        user={user}
        greeting={greeting}
        isDark={isDark}
        search={search}
        onSearchChange={setSearch}
        tab={tab}
        onTabChange={setTab}
        allCount={userLists.length}
        myCount={my.length}
        groupsCount={groups.length}
        totalUnreadCount={totalUnreadCount}
        notificationsLoading={notificationsLoading}
        onAvatarClick={() => navigate('/profile')}
        onNotificationsClick={() => setShowNotifications(true)}
        onSettingsClick={() => navigate('/settings')}
        t={t}
      />

      <HomeListContent
        contentRef={contentRef}
        listsFetchError={listsFetchError}
        hasAnyLists={lists.length > 0}
        listsLoading={listsLoading}
        tab={tab}
        isDark={isDark}
        orderedDisplay={orderedDisplay}
        user={user}
        isGroupMuted={isGroupMuted}
        onToggleMute={toggleGroupMute}
        onSelectList={onSelectList}
        onEditList={(list) => setEditList({ ...list })}
        onDeleteList={(list) => setConfirmDeleteList(list)}
        onLeaveList={onLeaveList ? (list) => setConfirmLeaveList(list) : undefined}
        reorderMode={reorderMode}
        dragIndex={dragIndex}
        dragOverIndex={dragOverIndex}
        cardRefs={cardRefs}
        hasOrderChanges={hasOrderChanges}
        onCancelReorder={handleCancelReorder}
        onSaveOrder={handleSaveOrder}
        onEnterReorder={handleEnterReorder}
        onDragHandleStart={handleDragStart}
        t={t}
      />

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <HomeMenuSheet closing={menuClosing} onClose={closeMenu} onSelectOption={openOption} t={t} />
      )}

      {/* Create Private List Modal */}
      {showCreate && (
        <CreateListModal
          isGroup={false}
          newL={newL}
          createError={createError}
          creatingList={creatingList}
          onClose={closeCreateModal}
          onUpdateField={updateNewListField}
          onSubmit={() => handleCreate(false)}
          t={t}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateListModal
          isGroup
          newL={newL}
          createError={createError}
          creatingList={creatingList}
          onClose={closeCreateGroupModal}
          onUpdateField={updateNewListField}
          onSubmit={() => handleCreate(true)}
          t={t}
        />
      )}

      {/* Join Group Modal */}
      {showJoin && (
        <JoinGroupModal
          joinCode={joinCode}
          joinPass={joinPass}
          joinError={joinError}
          joinCooldown={joinCooldown}
          joiningGroup={joiningGroup}
          passwordInputRef={passwordInputRef}
          onClose={closeJoinModal}
          onCodeChange={setJoinCode}
          onPassChange={setJoinPass}
          onClearError={() => setJoinError('')}
          onSubmit={handleJoin}
          onOpenQRScanner={() => { setScannerMounted(true); setShowQRScanner(true); }}
          t={t}
        />
      )}

      {/* Edit List Modal */}
      {editList && <EditListModal
        isOpen
        list={editList}
        editData={editListData}
        hasChanges={editListHasChanges}
        saving={savingList}
        onClose={() => !savingList && setEditList(null)}
        onSave={saveEditList}
        onUpdateData={(data) => {
          if (!editList) return;
          setEditList({ ...editList, ...data });
        }}
        onConvertToGroup={!editList.isGroup ? (password: string) => {
          onEditList({ ...editList, isGroup: true, password });
          setEditList(null);
        } : undefined}
        onConvertToPrivate={editList.isGroup && editList.members.length === 0 ? () => {
          if (isGroupMuted(editList.id)) {
            updateNotifications({ mutedGroupIds: settings.notifications.mutedGroupIds.filter(id => id !== editList.id) });
          }
          onEditList({ ...editList, isGroup: false, password: null });
          setEditList(null);
        } : undefined}
        onChangePassword={editList.isGroup ? (password: string) => {
          onEditList({ ...editList, password });
          setEditList(null);
        } : undefined}
      />}

      {/* Confirm Delete */}
      {confirmDeleteList && (
        <ConfirmModal
          title={confirmDeleteList.isGroup ? t('deleteGroupTitle') : t('deleteListTitle')}
          message={`${t('delete')} "${confirmDeleteList.name}"? ${t('deleteConfirmMessage')}`}
          confirmText={t('delete')}
          onConfirm={deleteList}
          onCancel={() => setConfirmDeleteList(null)}
        />
      )}

      {/* Confirm Leave */}
      {confirmLeaveList && (
        <ConfirmModal
          title={t('leaveGroup')}
          message={`${t('leaveGroupConfirm')}\n"${confirmLeaveList.name}"`}
          confirmText={t('leaveGroup')}
          onConfirm={handleLeaveList}
          onCancel={() => setConfirmLeaveList(null)}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsModal
          notifications={allNotifications}
          dismissingNotifications={dismissingNotifications}
          onClose={() => setShowNotifications(false)}
          onDismiss={handleDismissNotification}
          onNavigate={(listId) => { setShowNotifications(false); setTimeout(() => navigate(`/list/${listId}`), 300); }}
          onMarkAllRead={handleMarkAllRead}
          t={t}
        />
      )}

      {/* Confirm Logout */}
      {confirmLogout && (
        <ConfirmModal title={t('logout')} message={t('logoutConfirm')} confirmText={t('logout')} onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />
      )}

      {/* Push Notification Prompt */}
      {showPushPrompt && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={handleDismissPushPrompt} />
          <Box sx={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 360,
            bgcolor: 'background.paper',
            borderRadius: '20px',
            p: 3,
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '16px', background: pushPromptError ? 'linear-gradient(135deg, #F59E0B, #EAB308)' : 'linear-gradient(135deg, #14B8A6, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, mx: 'auto', mb: 2 }}>
              {pushPromptError ? '⚠️' : '🔔'}
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {pushPromptError ? t('pushNotifBlocked') : t('enableNotifications')}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {pushPromptError ? t('pushNotifBlockedDesc') : t('pushNotifBenefits')}
            </Typography>
            {!pushPromptError && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleEnablePush}
                disabled={pushLoading}
                sx={{ py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px', mb: 1.5 }}
              >
                {pushLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  t('enableNotifications')
                )}
              </Button>
            )}
            <Button
              fullWidth
              onClick={handleDismissPushPrompt}
              sx={{ py: 1, fontSize: 14, color: 'text.secondary' }}
            >
              {pushPromptError ? t('gotIt') : t('notNow')}
            </Button>
          </Box>
        </>
      )}

      <PwaInstallPrompt t={t} />

      {/* סורק QR - קופץ מעל JoinModal, ממלא את הקוד והסיסמה אוטומטית.
          scannerMounted דוחה את טעינת ה-chunk (@zxing) עד לפתיחה ראשונה בפועל. */}
      {scannerMounted && (
      <Suspense fallback={null}>
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(text) => {
          setShowQRScanner(false);
          // הפורמט שאנחנו מייצרים: {origin}/join?code=XXX&password=YYYY
          let code = '';
          let password = '';
          let isOurFormat = false;
          try {
            const url = new URL(text);
            code = (url.searchParams.get('code') || '').toUpperCase();
            password = url.searchParams.get('password') || '';
            // QR שלנו = יש קוד 6 תווים, סיסמה 4 ספרות, כתובת תואמת
            if (code.length === 6 && /^\d{4}$/.test(password)) isOurFormat = true;
          } catch {
            const match = text.trim().match(/^([A-Z0-9]{6})[:\s]*(\d{4})?$/i);
            if (match) {
              code = match[1].toUpperCase();
              password = match[2] || '';
              if (code.length === 6 && /^\d{4}$/.test(password)) isOurFormat = true;
            }
          }
          if (isOurFormat) {
            setJoinCode(code);
            setJoinPass(password);
            setJoinError('');
          } else if (code.length === 6) {
            // קוד נראה תקין אבל סיסמה חסרה/לא תואמת
            setJoinCode(code);
            setJoinError('הקוד זוהה אך הסיסמה חסרה או לא תקפה. הזינו סיסמה ידנית.');
          } else {
            // לא QR שלנו
            setJoinError('זה לא QR להצטרפות לקבוצה. סרקו את ה-QR שקיבלתם מהמזמין.');
          }
        }}
      />
      </Suspense>
      )}
    </Box>

      {/* Bottom Navigation + FAB - ב-portal ל-document.body, ראה HomeBottomNav */}
      {!showMenu && !showJoin && !showCreate && !showCreateGroup && (
        <>
          <HomeBottomNav contentRef={contentRef} onOpenMenu={() => setShowMenu(true)} t={t} />
          <AiAssistantFab />
        </>
      )}
    </>
  );
});

HomeComponent.displayName = 'HomeComponent';
