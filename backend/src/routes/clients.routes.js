const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createClientSchema, updateClientSchema, getClientByIdSchema } = require('../validators/clients.validator');

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management (receptionist, admin)
 */

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Get all clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *     responses:
 *       200:
 *         description: List of clients with pagination
 */
router.get('/', authenticate(['admin', 'receptionist']), clientsController.getAll);

/**
 * @swagger
 * /api/clients/{id}:
 *   get:
 *     summary: Get client by ID with pets
 *     tags: [Clients]
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
 *         description: Client details with pets
 *       404:
 *         description: Client not found
 */
router.get('/:id', authenticate(['admin', 'receptionist', 'doctor']), validate(getClientByIdSchema), clientsController.getById);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Create new client
 *     tags: [Clients]
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
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 */
router.post('/', authenticate(['admin', 'receptionist']), validate(createClientSchema), clientsController.create);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
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
 *     responses:
 *       200:
 *         description: Client updated successfully
 */
router.put('/:id', authenticate(['admin', 'receptionist']), validate(updateClientSchema), clientsController.update);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Delete client
 *     tags: [Clients]
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
 *         description: Client deleted successfully
 */
router.delete('/:id', authenticate(['admin']), validate(getClientByIdSchema), clientsController.delete);

/**
 * @swagger
 * /api/clients/{id}/pets:
 *   get:
 *     summary: Get client's pets
 *     tags: [Clients]
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
 *         description: List of client's pets
 */
router.get('/:id/pets', authenticate(['admin', 'receptionist', 'doctor']), validate(getClientByIdSchema), clientsController.getPets);

module.exports = router;
