import type { User } from '../../../global/types';

export interface ProfileScreenProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

export interface ProfileFormData {
  name: string;
  email: string;
  avatarColor?: string;
  avatarEmoji?: string;
}
