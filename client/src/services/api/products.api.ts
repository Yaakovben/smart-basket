import apiClient from './client';
import type { Product } from './lists.api';

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

// תגובת מוצר בודד מה-API (addProduct)
export interface ApiProductResponse {
  id: string;
  name: string;
  quantity: number;
  unit: Product['unit'];
  category: Product['category'];
  isPurchased: boolean;
  addedBy: string;
  createdAt: string;
}

export const productsApi = {
  async addProduct(listId: string, data: CreateProductData): Promise<ApiProductResponse> {
    const response = await apiClient.post<{ data: ApiProductResponse }>(`/lists/${listId}/products`, data);
    return response.data.data;
  },

  async updateProduct(listId: string, productId: string, data: UpdateProductData): Promise<void> {
    await apiClient.put(`/lists/${listId}/products/${productId}`, data);
  },

  async deleteProduct(listId: string, productId: string): Promise<void> {
    await apiClient.delete(`/lists/${listId}/products/${productId}`);
  },
};

export default productsApi;
