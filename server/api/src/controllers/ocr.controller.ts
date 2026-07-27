import type { Response } from 'express';
import * as ocrService from '../services/ocr.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { ScanListInput } from '../validators';

export const scanList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { image } = req.body as ScanListInput;
  const text = await ocrService.scanListImage(image);
  res.json({ success: true, data: { text } });
});
