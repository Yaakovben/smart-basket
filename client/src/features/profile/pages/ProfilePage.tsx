import type { ProfilePageProps } from '../types/profile-types';
import { ProfileContent } from '../components/ProfileContent';

export const ProfilePage = (props: ProfilePageProps) => {
  return <ProfileContent {...props} />;
};
