// ===== יצירת קוד =====
export const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const generatePassword = (): string => {
  return String(Math.floor(1000 + Math.random() * 9000));
};

// ===== יצירת מזהה רשימה =====
export const generateListId = (): string => {
  return `l${Date.now()}`;
};
