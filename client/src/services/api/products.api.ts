import apiClient from './client';
import type { List, Product } from './lists.api';

export interface CreateProductData {
  name: string;
  quantity?: number;
  unit?: Product['unit'];
  category?: Product['category'];
}

export interface UpdateProductData {
  name?: string;
  quantity?: number;
  unit?: Product['unit'];
  category?: Product['category'];
  isPurchased?: boolean;
}

export const productsApi = {
  // Add product to list
  async addProduct(listId: string, data: CreateProductData): Promise<List> {
    const response = await apiClient.post<{ data: List }>(`/lists/${listId}/products`, data);
    return response.data.data;
  },

  // Update product
  async updateProduct(listId: string, productId: string, data: UpdateProductData): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${listId}/products/${productId}`, data);
    return response.data.data;
  },

  // Delete product
  async deleteProduct(listId: string, productId: string): Promise<List> {
    const response = await apiClient.delete<{ data: List }>(`/lists/${listId}/products/${productId}`);
    return response.data.data;
  },

  // Toggle purchased status
  async togglePurchased(listId: string, productId: string): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${listId}/products/${productId}/toggle`);
    return response.data.data;
  },

  // Reorder products
  async reorderProducts(listId: string, productIds: string[]): Promise<List> {
    const response = await apiClient.put<{ data: List }>(`/lists/${listId}/products/reorder`, { productIds });
    return response.data.data;
  },
};

export default productsApi;
