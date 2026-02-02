// ===== Form State =====
export interface AuthFormState {
  name: string;
  email: string;
  password: string;
  error: string;
  googleLoading: boolean;
  emailLoading: boolean;
  isNewUser: boolean;
  showEmailForm: boolean;
}

// ===== Hook Return Type =====
export interface UseAuthReturn {
  // State
  name: string;
  email: string;
  password: string;
  error: string;
  googleLoading: boolean;
  emailLoading: boolean;
  isNewUser: boolean;
  showEmailForm: boolean;
  emailSuggestion: string | null;
  emailChecked: boolean;
  isGoogleAccount: boolean;
  checkingEmail: boolean;

  // Setters
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setError: (error: string) => void;
  setShowEmailForm: (show: boolean) => void;

  // Handlers
  handleEmailChange: (email: string) => void;
  handlePasswordChange: (password: string) => void;
  handleEmailSubmit: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoogleSuccess: (tokenResponse: { access_token: string }) => Promise<void>;
  handleGoogleError: () => void;
  toggleEmailForm: () => void;
  applySuggestion: () => void;
  isValidEmail: (email: string) => boolean;
  checkEmailExists: () => Promise<void>;
}

// ===== Google User Info =====
export interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}
