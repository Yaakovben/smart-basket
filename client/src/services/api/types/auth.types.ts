export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  isAdmin: boolean;
  createdAt: string;
  // קבוצות מושתקות - מקור האמת ל-push filtering בשרת. אופציונלי
  // כי GET /me לא תמיד מחזיר אותו (תלוי גרסת השרת/projection).
  mutedGroupIds?: string[];
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CheckEmailResponse {
  exists: boolean;
  isGoogleAccount: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}
