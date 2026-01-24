import type { List, User } from '../../../global/types';

export interface HomeScreenProps {
  lists: List[];
  onSelectList: (list: List) => void;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (
    code: string,
    password: string,
  ) => { success: boolean; error?: string };
  onLogout: () => void;
  onMarkNotificationsRead: (listId: string) => void;
  user: User;
}

export interface NewListData {
  name: string;
  icon: string;
  color: string;
}

export type TabType = 'all' | 'my' | 'groups';
