/**
 * list.routes.ts
 *
 * נתיבי רשימות ומוצרים.
 * מותקן ב-/api/lists. כל הנתיבים דורשים אימות.
 */

import { Router } from 'express';
import {
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
  joinGroup,
  leaveGroup,
  removeMember,
  toggleMemberAdmin,
} from '../controllers/list.controller';
import { authenticate, validate, joinGroupLimiter } from '../middleware';
import { listValidator } from '../validators';

const router = Router();

router.use(authenticate);

// === Collection ===
router.get('/', getLists);
router.post('/', validate(listValidator.create), createList);

// חייב לבוא לפני /:id כדי ש-Express לא יתפוס את "join" כמזהה
router.post('/join', joinGroupLimiter, validate(listValidator.join), joinGroup);

// === Item ===
router.get('/:id', validate({ params: listValidator.params }), getList);
router.put('/:id', validate({ body: listValidator.update, params: listValidator.params }), updateList);
router.delete('/:id', validate({ params: listValidator.params }), deleteList);

// === חברות בקבוצה ===
router.post('/:id/leave', validate({ params: listValidator.params }), leaveGroup);
router.delete('/:id/members/:memberId', validate({ params: listValidator.memberParams }), removeMember);
router.patch('/:id/members/:memberId/admin', validate({ params: listValidator.memberParams }), toggleMemberAdmin);

export default router;
