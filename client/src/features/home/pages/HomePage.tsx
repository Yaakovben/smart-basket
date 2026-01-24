import { HomeComponent } from '../components/HomeComponent';

export const HomePage = (props: React.ComponentProps<typeof HomeComponent>) => {
  return <HomeComponent {...props} />;
};
