import { Request } from 'express';

// ===== Auth Types =====
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ===== User Types =====
export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  isAdmin: boolean;
  createdAt: Date;
}

// ===== Product Types =====
export type ProductUnit = 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
export type ProductCategory =
  | 'מוצרי חלב'
  | 'מאפים'
  | 'ירקות'
  | 'פירות'
  | 'בשר'
  | 'משקאות'
  | 'ממתקים'
  | 'ניקיון'
  | 'אחר';

export interface IProductResponse {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  createdAt: Date;
}

// ===== Member Types =====
export interface IMemberResponse {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  joinedAt: Date;
}

// ===== List Types =====
export interface IListResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: IUserResponse;
  members: IMemberResponse[];
  products: IProductResponse[];
  inviteCode?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== API Response Types =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

// ===== Pagination Types =====
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

