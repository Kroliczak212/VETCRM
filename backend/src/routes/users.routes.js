const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, updateUserSchema, getUserByIdSchema } = require('../validators/users.validator');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin) or doctors list (receptionist)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: roleId
 *         schema:
 *           type: integer
 *         description: Filter by role (1=admin, 2=receptionist, 3=doctor, 4=client)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role name (admin, receptionist, doctor, client)
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', authenticate(['admin', 'receptionist']), usersController.getAll);

/**
 * @swagger
 * /api/users/doctors:
 *   get:
 *     summary: Get all active doctors (available for all authenticated users)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active doctors
 */
router.get('/doctors', authenticate(), usersController.getDoctors);

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Get all available roles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/roles', authenticate(['admin']), usersController.getRoles);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate(['admin']), validate(getUserByIdSchema), usersController.getById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new staff user (admin, receptionist, doctor)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - phone
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               roleId:
 *                 type: integer
 *                 description: 1=admin, 2=receptionist, 3=doctor
 *               details:
 *                 type: object
 *                 properties:
 *                   specialization:
 *                     type: string
 *                   licenseNumber:
 *                     type: string
 *                   experienceYears:
 *                     type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/', authenticate(['admin']), validate(createUserSchema), usersController.create);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               details:
 *                 type: object
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', authenticate(['admin']), validate(updateUserSchema), usersController.update);

/**
 * @swagger
 * /api/users/{id}/is-active:
 *   patch:
 *     summary: Update user's active status (activate/deactivate)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: true to activate, false to deactivate
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 */
router.patch('/:id/is-active', authenticate(['admin']), usersController.updateIsActive);

/**
 * @swagger
 * /api/users/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User restored successfully
 *       404:
 *         description: Deleted user not found
 *       409:
 *         description: Cannot restore - email already in use
 */
router.post('/:id/restore', authenticate(['admin']), usersController.restore);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (soft delete if has history, hard delete otherwise)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Cannot delete user with future appointments or pending schedules
 */
router.delete('/:id', authenticate(['admin']), validate(getUserByIdSchema), usersController.delete);

module.exports = router;
