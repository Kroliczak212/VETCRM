const express = require('express');
const router = express.Router();
const petsController = require('../controllers/pets.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPetSchema, updatePetSchema, getPetByIdSchema, getDocumentationSchema, createPetByClientSchema } = require('../validators/pets.validator');

/**
 * @swagger
 * tags:
 *   name: Pets
 *   description: Pet management
 */

/**
 * @swagger
 * /api/pets:
 *   get:
 *     summary: Get all pets
 *     tags: [Pets]
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
 *         name: ownerId
 *         schema:
 *           type: integer
 *         description: Filter by owner (client)
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pets
 */
router.get('/', authenticate(), petsController.getAll);

/**
 * @swagger
 * /api/pets/{id}:
 *   get:
 *     summary: Get pet by ID with medical history
 *     tags: [Pets]
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
 *         description: Pet details with medical history
 */
router.get('/:id', authenticate(['admin', 'receptionist', 'doctor']), validate(getPetByIdSchema), petsController.getById);

/**
 * @swagger
 * /api/pets:
 *   post:
 *     summary: Create new pet
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerId
 *               - name
 *               - species
 *             properties:
 *               ownerId:
 *                 type: integer
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *               breed:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [male, female, unknown]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pet created successfully
 */
router.post('/', authenticate(['admin', 'receptionist']), validate(createPetSchema), petsController.create);

/**
 * @swagger
 * /api/pets/{id}:
 *   put:
 *     summary: Update pet
 *     tags: [Pets]
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
 *         description: Pet updated successfully
 */
router.put('/:id', authenticate(['admin', 'receptionist']), validate(updatePetSchema), petsController.update);

/**
 * @swagger
 * /api/pets/{id}:
 *   delete:
 *     summary: Delete pet
 *     tags: [Pets]
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
 *         description: Pet deleted successfully
 */
router.delete('/:id', authenticate(['admin', 'receptionist']), validate(getPetByIdSchema), petsController.delete);

// =====================================================
// CLIENT SELF-SERVICE ROUTES
// =====================================================

/**
 * @swagger
 * /api/pets/my:
 *   post:
 *     summary: Create new pet (client self-service)
 *     description: Allows clients to add a new pet. The pet is automatically assigned to the authenticated client.
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - species
 *             properties:
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *               breed:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [male, female, unknown]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               weight:
 *                 type: number
 *               microchipNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pet created successfully
 */
router.post('/my', authenticate(['client']), validate(createPetByClientSchema), petsController.createByClient);

/**
 * @swagger
 * /api/pets/my/{id}:
 *   put:
 *     summary: Update pet (client self-service)
 *     description: Allows clients to update their own pet. Client can only update pets they own.
 *     tags: [Pets]
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
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *               breed:
 *                 type: string
 *               sex:
 *                 type: string
 *                 enum: [male, female, unknown]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               weight:
 *                 type: number
 *               microchipNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pet updated successfully
 *       403:
 *         description: Forbidden - pet does not belong to client
 */
router.put('/my/:id', authenticate(['client']), validate(updatePetSchema), petsController.updateByClient);

/**
 * @swagger
 * /api/pets/{id}/documentation/pdf:
 *   get:
 *     summary: Generate PDF documentation for a pet
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601)
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/documentation/pdf', authenticate(['client']), validate(getDocumentationSchema), petsController.generateDocumentationPDF);

module.exports = router;
