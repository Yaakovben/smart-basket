import apiClient, { setTokens, clearTokens, getRefreshToken, getAccessToken, setAuthInProgress } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  isAdmin: boolean;
  createdAt: string;
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

// Helper to save tokens and verify they were saved
const saveAndVerifyTokens = (accessToken: string, refreshToken: string): void => {
  setTokens(accessToken, refreshToken);
  // Verify tokens were actually saved (some browsers/extensions may block localStorage)
  const savedToken = getAccessToken();
  if (!savedToken) {
    throw new Error('Failed to save authentication tokens. Please check if localStorage is enabled.');
  }
};

export const authApi = {
  // Check if email exists
  async checkEmail(email: string, options?: { signal?: AbortSignal }): Promise<CheckEmailResponse> {
    const response = await apiClient.post<{ data: CheckEmailResponse }>('/auth/check-email', { email }, { signal: options?.signal });
    return response.data.data;
  },

  // Register new user
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
      // Small delay to ensure state updates complete before allowing redirects
      setTimeout(() => setAuthInProgress(false), 100);
    }
  },

  // Login with email/password
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

  // Login/Register with Google
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

  // Logout
  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore errors on logout
      }
    }
    clearTokens();
  },

  // Get current user profile
  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ data: User }>('/users/me');
    return response.data.data;
  },

  // Update profile
  async updateProfile(data: Partial<Pick<User, 'name' | 'email' | 'avatarColor' | 'avatarEmoji'>>): Promise<User> {
    const response = await apiClient.put<{ data: User }>('/users/me', data);
    return response.data.data;
  },

  // Toggle mute for a group (server-side for push filtering)
  async toggleMuteGroup(groupId: string): Promise<{ mutedGroupIds: string[] }> {
    const response = await apiClient.post<{ data: { mutedGroupIds: string[] } }>('/users/me/muted-groups/toggle', { groupId });
    return response.data.data;
  },

  // Delete account
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
    clearTokens();
  },
};

export default authApi;
