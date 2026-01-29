import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { ApiError, asyncHandler } from '../utils';
import { env } from '../config';
import type { AuthRequest, TokenPayload } from '../types';

export const authenticate = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

      const user = await User.findById(decoded.userId).select('email isAdmin');

      if (!user) {
        throw ApiError.unauthorized('User not found');
      }

      req.user = {
        id: decoded.userId,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid access token');
      }
      throw error;
    }
  }
);

export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    throw ApiError.forbidden('Admin access required');
  }
  next();
};
