import { STORAGE_KEYS } from '../constants';

export const StorageService = {
  isHintSeen: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.HINT_SEEN) === 'true';
  },

  markHintSeen: (): void => {
    localStorage.setItem(STORAGE_KEYS.HINT_SEEN, 'true');
  },
};
