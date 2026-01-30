import { Router } from 'express';
import { AuthController } from '../controllers';
import { validate, authLimiter } from '../middleware';
import { registerSchema, loginSchema, googleAuthSchema, refreshTokenSchema, checkEmailSchema } from '../utils/validators';

const router = Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

router.post('/check-email', validate(checkEmailSchema), AuthController.checkEmail);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/google', validate(googleAuthSchema), AuthController.googleAuth);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.post('/logout', validate(refreshTokenSchema), AuthController.logout);

export default router;
