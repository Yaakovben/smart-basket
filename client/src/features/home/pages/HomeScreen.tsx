import type { HomeScreenProps } from '../types/home-types';
import { HomeContent } from '../components/HomeContent';

export function HomeScreen(props: HomeScreenProps) {
  return <HomeContent {...props} />;
}
