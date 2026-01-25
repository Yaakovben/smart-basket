// ===== Haptic Feedback (shared across all features) =====
export const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[style]);
  }
};

// Re-export constants for backward compatibility
export {
  CATEGORY_ICONS,
  MEMBER_COLORS,
  LIST_ICONS,
  GROUP_ICONS,
  LIST_COLORS,
  SWIPE_ACTIONS_WIDTH,
  STORAGE_KEYS,
  TOAST_CONFIG,
  MENU_OPTIONS,
  DEFAULT_SETTINGS,
  LANGUAGES,
  SIZES,
  COMMON_STYLES
} from '../constants';

// List operations helpers
export {
  createNotification,
  userToMember,
  addMemberToList,
  removeMemberFromList,
  markListNotificationsRead,
  findGroupByCode,
  isUserInGroup,
  validateJoinGroup,
  generateInviteMessage,
  generateShareListMessage
} from './listOperations';
export type { JoinGroupResult } from './listOperations';

// Re-export feature helpers for backward compatibility
export { isValidEmail, getPasswordStrength } from '../../features/auth/helpers/auth-helpers';
export { formatDate, formatTime } from '../../features/list/helpers/list-helpers';
export { generateInviteCode, generatePassword } from '../../features/home/helpers/home-helpers';
