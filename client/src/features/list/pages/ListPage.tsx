import type { ListPageProps } from '../types/list-types';
import { ListContent } from '../components/ListContent';

export const ListPage = (props: ListPageProps) => {
  return <ListContent {...props} />;
};
