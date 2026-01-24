// ===== Date/Time Formatting =====
export const formatDate = (date = new Date()): string => {
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatTime = (date = new Date()): string => {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

// ===== Product ID Generation =====
export const generateProductId = (): string => {
  return `p${Date.now()}`;
};
