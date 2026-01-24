import { ListComponent } from '../components/ListComponent';

export const ListPage = (props: React.ComponentProps<typeof ListComponent>) => {
  return <ListComponent {...props} />;
};
