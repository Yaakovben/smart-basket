import type { ListScreenProps } from '../types/list-types';
import { ListContent } from '../components/ListContent';

export function ListScreen(props: ListScreenProps) {
  return <ListContent {...props} />;
}
