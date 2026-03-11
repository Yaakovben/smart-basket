import type { Response } from 'express';
import { ProductService } from '../services';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { CreateProductInput, UpdateProductInput, ReorderProductsInput } from '../validators';

export class ProductController {
  static addProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.params;
    const data = req.body as CreateProductInput;
    const product = await ProductService.addProduct(listId, userId, data);

    res.status(201).json({
      success: true,
      data: product,
    });
  });

  static updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId, productId } = req.params;
    const data = req.body as UpdateProductInput;
    await ProductService.updateProduct(listId, productId, userId, data);

    res.json({ success: true });
  });

  static deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId, productId } = req.params;
    await ProductService.deleteProduct(listId, productId, userId);

    res.json({ success: true });
  });

  static clearProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.params;
    const filter = (req.query.filter as string) || 'all';
    if (!['all', 'purchased', 'pending'].includes(filter)) {
      res.status(400).json({ success: false, error: 'Invalid filter' });
      return;
    }
    const deletedCount = await ProductService.clearProducts(listId, userId, filter as 'all' | 'purchased' | 'pending');

    res.json({ success: true, data: { deletedCount } });
  });

  static reorderProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.params;
    const { productIds } = req.body as ReorderProductsInput;
    await ProductService.reorderProducts(listId, userId, productIds);

    res.json({ success: true });
  });
}
