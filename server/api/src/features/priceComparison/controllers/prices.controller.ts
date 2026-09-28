import type { Response } from 'express';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';
import type { CompareBasketInput } from '../../../validators/prices.validator';
import { listChains, listChainBranchesApi, getBranchProduct, compareProduct, compareBasket } from '../services/pricesApi.service';
import { PriceSyncLogDAL } from '../dal/priceSyncLog.dal';
import { PRICE_SOURCES } from '../data/price-sources.data';

// GET /api/price-comparison/chains - הרשתות, מספר סניפים, תתי-רשתות ומצב הסנכרון האחרון
export const getChains = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await listChains() });
});

// GET /api/price-comparison/chains/:chainId/branches?subChain=
export const getChainBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subChain = typeof req.query.subChain === 'string' ? req.query.subChain : undefined;
  res.json({ success: true, data: await listChainBranchesApi(req.params.chainId, subChain) });
});

// GET /api/price-comparison/branches/:branchId/products/:barcode - מחיר מוצר בסניף ומבצעים
export const getBranchProductPrice = asyncHandler(async (req: AuthRequest, res: Response) => {
  const includeClub = (req.query as { includeClubPromos?: boolean }).includeClubPromos === true;
  res.json({ success: true, data: await getBranchProduct(req.params.branchId, req.params.barcode, includeClub) });
});

// GET /api/price-comparison/products/:barcode - המוצר בכל הרשתות
export const getProductComparison = asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await compareProduct(req.params.barcode) });
});

// POST /api/price-comparison/compare-basket - מחיר הסל בכל סניף שנבחר
export const postCompareBasket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items, branchIds, includeClubPromos } = req.body as CompareBasketInput;
  res.json({ success: true, data: await compareBasket(items, branchIds, includeClubPromos) });
});

// GET /api/price-comparison/sources (admin) - מיפוי המקורות הרשמיים
export const getSources = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: PRICE_SOURCES });
});

// GET /api/price-comparison/sync-logs?chainId=&limit= (admin) - לוג הסנכרון השמור
export const getSyncLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chainId, limit } = req.query as { chainId?: string; limit?: number };
  res.json({ success: true, data: await PriceSyncLogDAL.recent(limit ?? 100, chainId) });
});
