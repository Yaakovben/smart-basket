import type { Response } from 'express';
import * as productService from '../services/product.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { CreateProductInput, UpdateProductInput, ReorderProductsInput } from '../validators';
import { invalidateInsightsCache } from '../services/insights.service';
import { invalidateAssistantContext } from '../services/aiAssistant.service';

export const addProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.params;
  const data = req.body as CreateProductInput;
  const product = await productService.addProduct(listId, userId, data);
  invalidateAssistantContext(userId);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId, productId } = req.params;
  const data = req.body as UpdateProductInput;
  await productService.updateProduct(listId, productId, userId, data);
  // שינוי isPurchased משפיע על חישובי spending/insights - מנקה cache
  if ('isPurchased' in data) invalidateInsightsCache(userId);
  // כל עדכון (גם שם/כמות/הערה, לא רק isPurchased) רלוונטי להקשר שה-AI
  // רואה - מנקים תמיד, לא רק ל-insights.
  invalidateAssistantContext(userId);
  res.json({ success: true });
});

export const deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId, productId } = req.params;
  await productService.deleteProduct(listId, productId, userId);
  invalidateAssistantContext(userId);
  res.json({ success: true });
});

export const clearProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.params;
  const filter = (req.query.filter as string) || 'all';
  if (!['all', 'purchased', 'pending'].includes(filter)) {
    res.status(400).json({ success: false, error: 'Invalid filter' });
    return;
  }
  const deletedCount = await productService.clearProducts(listId, userId, filter as 'all' | 'purchased' | 'pending');
  invalidateAssistantContext(userId);
  res.json({ success: true, data: { deletedCount } });
});

export const resetProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.params;
  const resetCount = await productService.resetProducts(listId, userId);
  invalidateAssistantContext(userId);
  res.json({ success: true, data: { resetCount } });
});

export const reorderProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { listId } = req.params;
  const { productIds } = req.body as ReorderProductsInput;
  await productService.reorderProducts(listId, userId, productIds);
  res.json({ success: true });
});
