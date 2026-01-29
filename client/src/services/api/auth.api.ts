import apiClient, { setTokens, clearTokens, getRefreshToken } from './client';

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

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', data);
    const { user, tokens } = response.data.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  },

  // Login with email/password
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', data);
    const { user, tokens } = response.data.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
  },

  // Login/Register with Google
  async googleAuth(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/google', { accessToken });
    const { user, tokens } = response.data.data;
    setTokens(tokens.accessToken, tokens.refreshToken);
    return { user, tokens };
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

  // Delete account
  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me');
    clearTokens();
  },
};

export default authApi;
