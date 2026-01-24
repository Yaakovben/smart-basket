import { ProfileComponent } from '../components/ProfileComponent';

export const ProfilePage = (props: React.ComponentProps<typeof ProfileComponent>) => {
  return <ProfileComponent {...props} />;
};
