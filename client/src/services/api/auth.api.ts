import apiClient, { setTokens, clearTokens, getRefreshToken, getAccessToken, setAuthInProgress } from './client';
import type { User, AuthResponse, LoginData, CheckEmailResponse, RegisterData } from './types/auth.types';

// שמירת טוקנים עם אימות שנשמרו (דפדפנים/extensions עלולים לחסום localStorage)
const saveAndVerifyTokens = (accessToken: string, refreshToken: string): void => {
  setTokens(accessToken, refreshToken);
  const savedToken = getAccessToken();
  if (!savedToken) {
    throw new Error('Failed to save authentication tokens. Please check if localStorage is enabled.');
  }
};

export const authApi = {
  async checkEmail(email: string, options?: { signal?: AbortSignal }): Promise<CheckEmailResponse> {
    const response = await apiClient.post<{ data: CheckEmailResponse }>('/auth/check-email', { email }, { signal: options?.signal });
    return response.data.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    setAuthInProgress(true);
    try {
      const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', data);
      const responseData = response.data?.data;
      if (!responseData?.user || !responseData?.tokens) {
        throw new Error('Invalid server response');
      }
      saveAndVerifyTokens(responseData.tokens.accessToken, responseData.tokens.refreshToken);
      return { user: responseData.user, tokens: responseData.tokens };
    } finally {
      // השהיה קצרה כדי לוודא שעדכוני state הושלמו לפני redirect
      setTimeout(() => setAuthInProgress(false), 100);
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    setAuthInProgress(true);
    try {
      const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', data);
      const responseData = response.data?.data;
      if (!responseData?.user || !responseData?.tokens) {
        throw new Error('Invalid server response');
      }
      saveAndVerifyTokens(responseData.tokens.accessToken, responseData.tokens.refreshToken);
      return { user: responseData.user, tokens: responseData.tokens };
    } finally {
      setTimeout(() => setAuthInProgress(false), 100);
    }
  },

  async googleAuth(accessToken: string): Promise<AuthResponse> {
    setAuthInProgress(true);
    try {
      const response = await apiClient.post<{ data: AuthResponse }>('/auth/google', { accessToken });
      const responseData = response.data?.data;
      if (!responseData?.user || !responseData?.tokens) {
        throw new Error('Invalid server response');
      }
      saveAndVerifyTokens(responseData.tokens.accessToken, responseData.tokens.refreshToken);
      return { user: responseData.user, tokens: responseData.tokens };
    } finally {
      setTimeout(() => setAuthInProgress(false), 100);
    }
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {
        // התעלמות משגיאות ב-logout
      }
    }
    clearTokens();
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ data: User }>('/users/me');
    return response.data.data;
  },

  async updateProfile(data: Partial<Pick<User, 'name' | 'email' | 'avatarColor' | 'avatarEmoji'>>): Promise<User> {
    const response = await apiClient.put<{ data: User }>('/users/me', data);
    return response.data.data;
  },

  // השתקת רשימה (בצד השרת לסינון push)
  async toggleMuteGroup(groupId: string): Promise<{ mutedGroupIds: string[] }> {
    const response = await apiClient.post<{ data: { mutedGroupIds: string[] } }>('/users/me/muted-groups/toggle', { groupId });
    return response.data.data;
  },

  // עדכון סדר רשימות
  async updateListOrder(listOrder: string[]): Promise<void> {
    await apiClient.put('/users/me/list-order', { listOrder });
  },

  // הוספה/הסרה של "מוצר קבוע" (שם מוצר שהמשתמש תמיד קונה)
  async toggleStaple(name: string): Promise<{ staples: string[] }> {
    const response = await apiClient.post<{ data: { staples: string[] } }>('/users/me/staples/toggle', { name });
    return response.data.data;
  },

  // רישום פתיחת אפליקציה לאדמין
  logAppOpen: () => apiClient.post('/auth/app-open').catch(() => {}),

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
    clearTokens();
  },
};
