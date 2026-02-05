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
    const list = await ProductService.addProduct(listId, userId, data);

    res.status(201).json({
      success: true,
      data: list,
    });
  });

  static updateProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId, productId } = req.params;
    const data = req.body as UpdateProductInput;
    const list = await ProductService.updateProduct(listId, productId, userId, data);

    res.json({
      success: true,
      data: list,
    });
  });

  static deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId, productId } = req.params;
    const list = await ProductService.deleteProduct(listId, productId, userId);

    res.json({
      success: true,
      data: list,
    });
  });

  static togglePurchased = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId, productId } = req.params;
    const list = await ProductService.togglePurchased(listId, productId, userId);

    res.json({
      success: true,
      data: list,
    });
  });

  static reorderProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { listId } = req.params;
    const { productIds } = req.body as ReorderProductsInput;
    const list = await ProductService.reorderProducts(listId, userId, productIds);

    res.json({
      success: true,
      data: list,
    });
  });
}
