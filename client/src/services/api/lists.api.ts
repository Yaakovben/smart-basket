import apiClient from './client';
import { validateId } from './validate-id';
import type { List, CreateListData, UpdateListData, JoinGroupData } from './types/lists.types';

export const listsApi = {
  async getLists(): Promise<List[]> {
    const response = await apiClient.get<{ data: List[] }>('/lists');
    return response.data.data;
  },

  async getList(id: string): Promise<List> {
    validateId(id, 'listId');
    const response = await apiClient.get<{ data: List }>(`/lists/${id}`);
    return response.data.data;
  },

  async createList(data: CreateListData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists', data);
    return response.data.data;
  },

  async updateList(id: string, data: UpdateListData): Promise<List> {
    validateId(id, 'listId');
    const response = await apiClient.put<{ data: List }>(`/lists/${id}`, data);
    return response.data.data;
  },

  async deleteList(id: string): Promise<{ memberIds: string[]; listName: string }> {
    validateId(id, 'listId');
    const response = await apiClient.delete<{ data: { memberIds: string[]; listName: string } }>(`/lists/${id}`);
    return response.data.data;
  },

  async joinGroup(data: JoinGroupData): Promise<List> {
    const response = await apiClient.post<{ data: List }>('/lists/join', data);
    return response.data.data;
  },

  async leaveGroup(id: string): Promise<void> {
    validateId(id, 'listId');
    await apiClient.post(`/lists/${id}/leave`);
  },

  async removeMember(listId: string, memberId: string): Promise<List> {
    validateId(listId, 'listId');
    validateId(memberId, 'memberId');
    const response = await apiClient.delete<{ data: List }>(`/lists/${listId}/members/${memberId}`);
    return response.data.data;
  },

  // === תבניות ===

  async getTemplates(): Promise<List[]> {
    const response = await apiClient.get<{ data: List[] }>('/lists/templates');
    return response.data.data;
  },

  async saveAsTemplate(listId: string, isTemplate: boolean): Promise<List> {
    validateId(listId, 'listId');
    const response = await apiClient.post<{ data: List }>(`/lists/${listId}/save-as-template`, { isTemplate });
    return response.data.data;
  },

  async applyTemplate(templateId: string): Promise<List> {
    validateId(templateId, 'templateId');
    const response = await apiClient.post<{ data: List }>(`/lists/templates/${templateId}/apply`);
    return response.data.data;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    validateId(templateId, 'templateId');
    await apiClient.delete(`/lists/templates/${templateId}`);
  },
};
