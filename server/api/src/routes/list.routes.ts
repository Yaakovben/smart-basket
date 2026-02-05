import { Router } from 'express';
import { ListController } from '../controllers';
import { authenticate, validate, joinGroupLimiter } from '../middleware';
import { listValidator } from '../validators';

const router = Router();

// All list routes require authentication
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/List' }
 */
router.get('/', ListController.getLists);

/**
 * @swagger
 * /lists:
 *   post:
 *     summary: Create a new list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               icon: { type: string }
 *               color: { type: string }
 *               isGroup: { type: boolean }
 *               password: { type: string, minLength: 4, maxLength: 4 }
 *     responses:
 *       201:
 *         description: List created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/List' }
 */
router.post('/', validate(listValidator.create), ListController.createList);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/List' }
 *       404:
 *         description: List not found
 */
router.get('/:id', ListController.getList);

/**
 * @swagger
 * /lists/{id}:
 *   put:
 *     summary: Update a list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               icon: { type: string }
 *               color: { type: string }
 *               password: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: List updated
 */
router.put('/:id', validate({ body: listValidator.update, params: listValidator.params }), ListController.updateList);

/**
 * @swagger
 * /lists/{id}:
 *   delete:
 *     summary: Delete a list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List deleted
 *       403:
 *         description: Only owner can delete
 */
router.delete('/:id', ListController.deleteList);

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
router.post('/join', joinGroupLimiter, validate(listValidator.join), ListController.joinGroup);

/**
 * @swagger
 * /lists/{id}/leave:
 *   post:
 *     summary: Leave a group list
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left group successfully
 *       403:
 *         description: Owner cannot leave
 */
router.post('/:id/leave', ListController.leaveGroup);

/**
 * @swagger
 * /lists/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from group
 *     tags: [Lists]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Only owner/admin can remove members
 */
router.delete('/:id/members/:memberId', ListController.removeMember);

// Notifications
router.put('/:id/notifications/read', ListController.markNotificationsRead);
router.put('/:id/notifications/:notificationId/read', ListController.markNotificationRead);

export default router;
