import { Router } from 'express';
import { ListController } from '../controllers';
import { authenticate, validate, joinGroupLimiter } from '../middleware';
import { listValidator } from '../validators';

const router = Router();

// כל נתיבי הרשימות דורשים אימות
router.use(authenticate);

/**
 * @swagger
 * /lists:
 *   get:
 *     summary: Get all user's lists
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of shopping lists
 */
router.get('/', ListController.getLists);

/**
 * @swagger
 * /lists:
 *   post:
 *     summary: Create a new list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', validate(listValidator.create), ListController.createList);

/**
 * @swagger
 * /lists/join:
 *   post:
 *     summary: Join a group list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inviteCode]
 *             properties:
 *               inviteCode: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Joined group successfully
 *       400:
 *         description: Invalid group password
 *       404:
 *         description: Invalid invite code
 *       409:
 *         description: Already a member
 */
// חייב להיות לפני /:id כדי לא להתפרש כ-ID
router.post('/join', joinGroupLimiter, validate(listValidator.join), ListController.joinGroup);

/**
 * @swagger
 * /lists/{id}:
 *   get:
 *     summary: Get a specific list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List details
 *       404:
 *         description: List not found
 */
router.get('/:id', validate({ params: listValidator.params }), ListController.getList);

/**
 * @swagger
 * /lists/{id}:
 *   put:
 *     summary: Update a list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', validate({ body: listValidator.update, params: listValidator.params }), ListController.updateList);

/**
 * @swagger
 * /lists/{id}:
 *   delete:
 *     summary: Delete a list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List deleted
 *       403:
 *         description: Only owner can delete
 */
router.delete('/:id', validate({ params: listValidator.params }), ListController.deleteList);

/**
 * @swagger
 * /lists/{id}/leave:
 *   post:
 *     summary: Leave a group list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Left group successfully
 *       403:
 *         description: Owner cannot leave
 */
router.post('/:id/leave', validate({ params: listValidator.params }), ListController.leaveGroup);

/**
 * @swagger
 * /lists/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from group
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Only owner/admin can remove members
 */
router.delete('/:id/members/:memberId', validate({ params: listValidator.memberParams }), ListController.removeMember);

export default router;
