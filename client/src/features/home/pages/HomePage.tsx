import type { HomePageProps } from '../types/home-types';
import { HomeContent } from '../components/HomeContent';

export const HomePage = (props: HomePageProps) => {
  return <HomeContent {...props} />;
};
