import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate, authLimiter, loginLimiter, registerLimiter } from '../middleware';
import { registerSchema, loginSchema, googleAuthSchema, refreshTokenSchema, checkEmailSchema } from '../utils/validators';

const router = Router();

// Apply general rate limiting to all auth routes
router.use(authLimiter);

router.post('/check-email', validate(checkEmailSchema), AuthController.checkEmail);
// Strict rate limiting for registration - 3 attempts per hour
router.post('/register', registerLimiter, validate(registerSchema), AuthController.register);
// Strict rate limiting for login - 5 attempts per 15 minutes
router.post('/login', loginLimiter, validate(loginSchema), AuthController.login);
// Google auth uses same login limiter
router.post('/google', loginLimiter, validate(googleAuthSchema), AuthController.googleAuth);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', validate(refreshTokenSchema), AuthController.logout);

export default router;
