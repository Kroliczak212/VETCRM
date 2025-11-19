const express = require('express');
const router = express.Router();
const petsController = require('../controllers/pets.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createPetSchema, updatePetSchema, getPetByIdSchema } = require('../validators/pets.validator');

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
 * /api/pets/species:
 *   get:
 *     summary: Get available species
 *     tags: [Pets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available species
 */
router.get('/species', authenticate(), petsController.getSpecies);

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

module.exports = router;
