import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate, authLimiter, loginLimiter, registerLimiter } from '../middleware';
import { authValidator } from '../validators';

const router = Router();

// Apply general rate limiting to all auth routes
router.use(authLimiter);

router.post('/check-email', validate(authValidator.checkEmail), AuthController.checkEmail);
// Strict rate limiting for registration - 3 attempts per hour
router.post('/register', registerLimiter, validate(authValidator.register), AuthController.register);
// Strict rate limiting for login - 5 attempts per 15 minutes
router.post('/login', loginLimiter, validate(authValidator.login), AuthController.login);
// Google auth uses same login limiter
router.post('/google', loginLimiter, validate(authValidator.googleAuth), AuthController.googleAuth);
router.post('/refresh', validate(authValidator.refreshToken), AuthController.refreshToken);
router.post('/logout', validate(authValidator.refreshToken), AuthController.logout);

export default router;
