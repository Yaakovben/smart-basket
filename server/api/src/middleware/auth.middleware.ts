import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserDAL } from '../dal';
import { asyncHandler } from '../utils';
import { AuthError, ForbiddenError, NotFoundError } from '../errors';
import { env } from '../config';
import type { AuthRequest, TokenPayload } from '../types';

export const authenticate = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw AuthError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

      const user = await UserDAL.findById(decoded.userId);

      if (!user) {
        throw NotFoundError.user();
      }

      req.user = {
        id: decoded.userId,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AuthError.tokenExpired();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw AuthError.invalidToken();
      }
      throw error;
    }
  }
);

export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    throw ForbiddenError.notAdmin();
  }
  next();
};
