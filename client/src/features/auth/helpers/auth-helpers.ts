// ===== Email Validation =====
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ===== Common Email Domains =====
const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'walla.co.il',
  'walla.com',
  'yahoo.co.il',
  'gmail.co.il',
  'live.com',
  'msn.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'yandex.com'
];

// Calculate Levenshtein distance between two strings
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// Check if email domain has a typo and suggest correction
export const checkEmailDomainTypo = (email: string): string | null => {
  if (!email.includes('@')) return null;

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  // If it's already a valid common domain, no suggestion needed
  if (COMMON_DOMAINS.includes(domain)) return null;

  // Find the closest matching domain
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const commonDomain of COMMON_DOMAINS) {
    const distance = levenshteinDistance(domain, commonDomain);
    // Only suggest if distance is 1-2 (close typo) and better than previous
    if (distance > 0 && distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = commonDomain;
    }
  }

  return bestMatch;
};

// ===== Password Strength =====
export interface PasswordStrength {
  strength: number;
  text: string;
  color: string;
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) return { strength: 0, text: '', color: '' };
  if (password.length < 8) return { strength: 1, text: 'חלשה', color: '#EF4444' };
  if (password.length < 10) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
  return { strength: 3, text: 'חזקה', color: '#10B981' };
};
