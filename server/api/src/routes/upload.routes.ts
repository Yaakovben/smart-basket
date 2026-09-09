import { Router } from 'express';
import { getUploadSignature, discardUpload } from '../controllers/upload.controller';
import { authenticate, imageUploadLimiter } from '../middleware';

const router = Router();

router.use(authenticate);

router.get('/signature', imageUploadLimiter, getUploadSignature);
// discard הוא ניקוי (best-effort), לא העלאה - לא סופר מול מכסת ה-40/שעה
// של ההעלאות עצמן (אחרת משתמש הפכפך שבוחר-מבטל היה נחסם מלהעלות). מוגן
// ע"י apiLimiter הגלובלי (1000/15דק' למשתמש מאומת).
router.post('/discard', discardUpload);

export default router;
