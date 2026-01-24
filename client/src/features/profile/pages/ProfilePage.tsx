import type { ProfilePageProps } from '../types/profile-types';
import { ProfileContent } from '../components/ProfileContent';

export function ProfilePage(props: ProfilePageProps) {
  return <ProfileContent {...props} />;
}
