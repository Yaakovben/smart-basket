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

export interface Notification {
  id: string;
  type: 'join' | 'leave';
  userId: string;
  userName: string;
  timestamp: string;
  read: boolean;
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
  notifications: Notification[];
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
  // Get all user's lists
  async getLists(): Promise<List[]> {
    const response = await apiClient.get<{ data: List[] }>('/lists');
    return response.data.data;
  },

  // Get single list
  async getList(id: string): Promise<List> {
    const response = await apiClient.get<{ data: List }>(`/lists/${id}`);
    return response.data.data;
  },

  // Create new list
  async createList(data: CreateListData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists', data);
    return response.data.data;
  },

  // Update list
  async updateList(id: string, data: UpdateListData): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${id}`, data);
    return response.data.data;
  },

  // Delete list
  async deleteList(id: string): Promise<void> {
    await apiClient.delete(`/lists/${id}`);
  },

  // Join group
  async joinGroup(data: JoinGroupData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists/join', data);
    return response.data.data;
  },

  // Leave group
  async leaveGroup(id: string): Promise<void> {
    await apiClient.post(`/lists/${id}/leave`);
  },

  // Remove member from group
  async removeMember(listId: string, memberId: string): Promise<List> {
    const response = await apiClient.delete<{ data: List }>(`/lists/${listId}/members/${memberId}`);
    return response.data.data;
  },

  // Mark notifications as read
  async markNotificationsRead(listId: string): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${listId}/notifications/read`);
    return response.data.data;
  },
};

export default listsApi;
