import apiClient from './client';
import { validateId } from './validate-id';
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
    validateId(listId, 'listId');
    const response = await apiClient.post<{ data: ApiProductResponse }>(`/lists/${listId}/products`, data);
    return response.data.data;
  },

  async updateProduct(listId: string, productId: string, data: UpdateProductData): Promise<void> {
    validateId(listId, 'listId');
    validateId(productId, 'productId');
    await apiClient.put(`/lists/${listId}/products/${productId}`, data);
  },

  async deleteProduct(listId: string, productId: string): Promise<void> {
    validateId(listId, 'listId');
    validateId(productId, 'productId');
    await apiClient.delete(`/lists/${listId}/products/${productId}`);
  },
};

export default productsApi;
