export const STORAGE_KEYS = {
  HINT_SEEN: 'sb_hint_seen',
} as const;

export const StorageService = {
  // Hint operations (only client-side preference)
  isHintSeen: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.HINT_SEEN) === 'true';
  },

  markHintSeen: (): void => {
    localStorage.setItem(STORAGE_KEYS.HINT_SEEN, 'true');
  },

  // Clear all data
  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
};
