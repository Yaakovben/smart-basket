import apiClient from './client';

export interface Member {
  user: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    avatarEmoji: string;
  };
  isAdmin: boolean;
  joinedAt: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
  category: 'מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'ניקיון' | 'אחר';
  isPurchased: boolean;
  addedBy: string;
  createdAt: string;
}

export interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    avatarEmoji: string;
    isAdmin: boolean;
  };
  members: Member[];
  products: Product[];
  inviteCode?: string;
  password?: string;
  hasPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListData {
  name: string;
  icon?: string;
  color?: string;
  isGroup?: boolean;
  password?: string;
}

export interface UpdateListData {
  name?: string;
  icon?: string;
  color?: string;
  password?: string | null;
}

export interface JoinGroupData {
  inviteCode: string;
  password?: string;
}

export const listsApi = {
  async getLists(): Promise<List[]> {
    const response = await apiClient.get<{ data: List[] }>('/lists');
    return response.data.data;
  },

  async getList(id: string): Promise<List> {
    const response = await apiClient.get<{ data: List }>(`/lists/${id}`);
    return response.data.data;
  },

  async createList(data: CreateListData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists', data);
    return response.data.data;
  },

  async updateList(id: string, data: UpdateListData): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${id}`, data);
    return response.data.data;
  },

  async deleteList(id: string): Promise<{ memberIds: string[]; listName: string }> {
    const response = await apiClient.delete<{ data: { memberIds: string[]; listName: string } }>(`/lists/${id}`);
    return response.data.data;
  },

  async joinGroup(data: JoinGroupData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists/join', data);
    return response.data.data;
  },

  async leaveGroup(id: string): Promise<void> {
    await apiClient.post(`/lists/${id}/leave`);
  },

  async removeMember(listId: string, memberId: string): Promise<List> {
    const response = await apiClient.delete<{ data: List }>(`/lists/${listId}/members/${memberId}`);
    return response.data.data;
  },
};

export default listsApi;
