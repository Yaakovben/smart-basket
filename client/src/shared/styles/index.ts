// ===== Shared Styles =====

export const S = {
  screen: { height: '100vh', display: 'flex', flexDirection: 'column' as const, background: '#F8FAFC', fontFamily: '-apple-system, sans-serif', direction: 'rtl' as const, maxWidth: '430px', margin: '0 auto', overflow: 'hidden', position: 'relative' as const },
  header: { background: 'linear-gradient(135deg, #14B8A6, #10B981)', padding: '48px 20px 20px', borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { flex: 1, color: 'white', fontSize: '18px', fontWeight: '700', textAlign: 'center' as const, margin: 0 },
  iconBtn: { width: '44px', height: '44px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', backdropFilter: 'blur(10px)' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', textAlign: 'right' as const },
  tabs: { display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '4px' },
  tab: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tabActive: { background: 'white', color: '#14B8A6' },
  content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '16px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' as const, overscrollBehavior: 'contain' as const },
  empty: { textAlign: 'center' as const, padding: '48px 20px' },
  emptyText: { fontSize: '18px', fontWeight: '600', color: '#6B7280', margin: '12px 0 0' },
  listCard: { display: 'flex', alignItems: 'center', gap: '14px', background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F1F5F9', transition: 'all 0.2s ease' },
  listIcon: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  badge: { background: '#CCFBF1', color: '#0D9488', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
  menuOption: { display: 'flex', alignItems: 'center', gap: '14px', background: '#F9FAFB', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', width: '100%' },
  settingRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '15px' },
  navItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' },
  actionBtn: { width: '67px', height: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' },
  actionLabel: { fontSize: '11px', color: 'white', fontWeight: '600' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, overflow: 'hidden' },
  sheet: { background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', maxHeight: '75vh', overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '12px 20px 32px', WebkitOverflowScrolling: 'touch' as const, overscrollBehavior: 'contain' as const, touchAction: 'pan-y' as const },
  handle: { width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 16px' },
  sheetTitle: { fontSize: '18px', fontWeight: '700', textAlign: 'center' as const, margin: '0 0 20px' },
  confirmBox: { background: 'white', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '320px', margin: 'auto' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
  input: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, textAlign: 'right' as const, transition: 'all 0.2s ease', minHeight: '52px' },
  primaryBtn: { width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #14B8A6, #10B981)', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)', transition: 'all 0.2s ease', minHeight: '52px' },
  secondaryBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#F3F4F6', color: '#374151', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #E5E7EB', background: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  dangerBtn: { padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease', flex: 1, minHeight: '48px' },
  dangerBtnFull: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  loginScreen: { height: '100vh', overflowY: 'auto' as const, background: 'white', fontFamily: '-apple-system, sans-serif', direction: 'rtl' as const, maxWidth: '430px', margin: '0 auto', padding: '48px 24px 80px', boxSizing: 'border-box' as const, WebkitOverflowScrolling: 'touch' as const },
  tabSwitch: { display: 'flex', background: '#F3F4F6', borderRadius: '12px', padding: '4px', marginBottom: '24px' },
  tabSwitchBtn: { flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#6B7280', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  tabSwitchActive: { background: 'white', color: '#14B8A6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  errorBox: { background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '10px', fontSize: '14px', textAlign: 'center' as const, marginBottom: '16px' },
  bottomNav: { position: 'fixed' as const, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: 'white', display: 'flex', justifyContent: 'space-around', padding: '8px 0 max(24px, env(safe-area-inset-bottom))', borderTop: '1px solid #F3F4F6', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 10 },
  fullScreen: { position: 'fixed' as const, inset: 0, zIndex: 100, background: '#F8FAFC', height: '100vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', maxWidth: '430px', margin: '0 auto', left: '50%', transform: 'translateX(-50%)' },
  scrollableContent: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, WebkitOverflowScrolling: 'touch' as const, padding: '20px', paddingBottom: '40px', overscrollBehavior: 'contain' as const },
  fullScreenModal: { position: 'fixed' as const, inset: 0, zIndex: 100, background: 'white', height: '100vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', maxWidth: '430px', margin: '0 auto', left: '50%', transform: 'translateX(-50%)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, minHeight: '64px', background: 'white' },
  closeBtn: { width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', transition: 'all 0.2s ease' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, flex: 1, textAlign: 'center' as const },
  modalContent: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, WebkitOverflowScrolling: 'touch' as const, padding: '20px', paddingBottom: '32px' },
};

// Constants
export const categoryIcons: Record<string, string> = { 'מוצרי חלב': '🧀', 'מאפים': '🍞', 'ירקות': '🥬', 'פירות': '🍎', 'בשר': '🥩', 'משקאות': '☕', 'ניקיון': '🧹', 'אחר': '📦' };
export const memberColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];
export const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];
export const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];
export const COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
export const ACTIONS_WIDTH = 200;

// Toast config
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export const toastConfig = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' },
  warning: { icon: '⚠', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245, 158, 11, 0.3)' }
};
