import type { ListPageProps } from '../types/list-types';
import { ListContent } from '../components/ListContent';

export function ListPage(props: ListPageProps) {
  return <ListContent {...props} />;
}
