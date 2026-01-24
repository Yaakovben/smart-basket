// ===== Email Validation =====
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ===== Password Strength =====
export interface PasswordStrength {
  strength: number;
  text: string;
  color: string;
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) return { strength: 0, text: '', color: '' };
  if (password.length < 4) return { strength: 1, text: 'חלשה', color: '#EF4444' };
  if (password.length < 6) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
  return { strength: 3, text: 'חזקה', color: '#10B981' };
};
