// ===== Code Generation =====
export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePassword = (): string => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

// ===== List ID Generation =====
export const generateListId = (): string => {
  return `l${Date.now()}`;
};
