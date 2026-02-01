import { z } from 'zod';

// ===== Auth Schemas =====
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    email: z.string().email('Invalid email format'),
    password: z.string().min(4, 'Password must be at least 4 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const checkEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1, 'Access token is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// ===== User Schemas =====
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    avatarColor: z.string().optional(),
    avatarEmoji: z.string().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(4, 'New password must be at least 4 characters'),
  }),
});

// ===== List Schemas =====
const productUnitEnum = z.enum(['יח׳', 'ק״ג', 'גרם', 'ליטר']);
const productCategoryEnum = z.enum([
  'מוצרי חלב', 'מאפים', 'ירקות', 'פירות', 'בשר',
  'משקאות', 'ממתקים', 'ניקיון', 'אחר'
]);

export const createListSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'List name must be at least 2 characters').max(50),
    icon: z.string().optional(),
    color: z.string().optional(),
    isGroup: z.boolean().optional(),
    password: z.string().length(4).optional(),
  }),
});

export const updateListSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    password: z.string().length(4).nullable().optional(),
  }),
});

export const joinGroupSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, 'Invite code is required'),
    password: z.string().length(4).optional(),
  }),
});

// ===== Product Schemas =====
export const createProductSchema = z.object({
  params: z.object({
    listId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').max(100),
    quantity: z.number().min(1).default(1),
    unit: productUnitEnum.default('יח׳'),
    category: productCategoryEnum.default('אחר'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    listId: z.string().min(1),
    productId: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    quantity: z.number().min(1).optional(),
    unit: productUnitEnum.optional(),
    category: productCategoryEnum.optional(),
    isPurchased: z.boolean().optional(),
  }),
});

export const reorderProductsSchema = z.object({
  params: z.object({
    listId: z.string().min(1),
  }),
  body: z.object({
    productIds: z.array(z.string()).min(1),
  }),
});

// ===== Notification Schemas =====
const notificationTypeEnum = z.enum([
  'join', 'leave', 'product_add', 'product_update',
  'product_delete', 'product_purchase', 'member_removed'
]);

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    listId: z.string().optional(),
    unreadOnly: z.string().optional(),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const markAllNotificationsReadSchema = z.object({
  body: z.object({
    listId: z.string().optional(),
  }),
});

export const createNotificationSchema = z.object({
  body: z.object({
    type: notificationTypeEnum,
    listId: z.string().min(1),
    listName: z.string().min(1),
    actorId: z.string().min(1),
    actorName: z.string().min(1),
    targetUserId: z.string().min(1),
    productId: z.string().optional(),
    productName: z.string().optional(),
  }),
});

export const broadcastNotificationSchema = z.object({
  body: z.object({
    listId: z.string().min(1),
    type: notificationTypeEnum,
    actorId: z.string().min(1),
    productId: z.string().optional(),
    productName: z.string().optional(),
  }),
});

// ===== Type exports =====
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type CheckEmailInput = z.infer<typeof checkEmailSchema>['body'];
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type CreateListInput = z.infer<typeof createListSchema>['body'];
export type UpdateListInput = z.infer<typeof updateListSchema>['body'];
export type JoinGroupInput = z.infer<typeof joinGroupSchema>['body'];
export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>['body'];
