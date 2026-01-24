import type { User } from '../../../global/types';

export interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type AuthMode = 'login' | 'register';
