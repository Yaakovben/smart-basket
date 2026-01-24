import type { ProfileScreenProps } from '../types/profile-types';
import { ProfileContent } from '../components/ProfileContent';

export function ProfileScreen(props: ProfileScreenProps) {
  return <ProfileContent {...props} />;
}
