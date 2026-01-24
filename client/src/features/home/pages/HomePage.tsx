import type { HomePageProps } from '../types/home-types';
import { HomeContent } from '../components/HomeContent';

export function HomePage(props: HomePageProps) {
  return <HomeContent {...props} />;
}
