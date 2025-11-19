const express = require('express');
const router = express.Router();
const vaccinationsController = require('../controllers/vaccinations.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createVaccinationSchema,
  updateVaccinationSchema,
  getVaccinationByIdSchema,
  getUpcomingByPetSchema
} = require('../validators/vaccinations.validator');

/**
 * @swagger
 * tags:
 *   name: Vaccinations
 *   description: Pet vaccination management
 */

/**
 * @swagger
 * /api/vaccinations:
 *   get:
 *     summary: Get all vaccinations
 *     tags: [Vaccinations]
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
 *         name: petId
 *         schema:
 *           type: integer
 *         description: Filter by pet ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [current, due_soon, overdue]
 *     responses:
 *       200:
 *         description: List of vaccinations
 */
router.get('/', authenticate(), vaccinationsController.getAll);

/**
 * @swagger
 * /api/vaccinations/pet/{petId}/upcoming:
 *   get:
 *     summary: Get upcoming vaccinations for a pet
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 90
 *     responses:
 *       200:
 *         description: List of upcoming vaccinations
 */
router.get('/pet/:petId/upcoming', authenticate(), validate(getUpcomingByPetSchema), vaccinationsController.getUpcomingByPet);

/**
 * @swagger
 * /api/vaccinations/{id}:
 *   get:
 *     summary: Get vaccination by ID
 *     tags: [Vaccinations]
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
 *         description: Vaccination details
 */
router.get('/:id', authenticate(), validate(getVaccinationByIdSchema), vaccinationsController.getById);

/**
 * @swagger
 * /api/vaccinations:
 *   post:
 *     summary: Create new vaccination record
 *     tags: [Vaccinations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petId
 *               - vaccineName
 *               - vaccinationDate
 *             properties:
 *               petId:
 *                 type: integer
 *               vaccineName:
 *                 type: string
 *               vaccinationDate:
 *                 type: string
 *                 format: date
 *               nextDueDate:
 *                 type: string
 *                 format: date
 *               batchNumber:
 *                 type: string
 *               appointmentId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vaccination record created successfully
 */
router.post('/', authenticate(['admin', 'receptionist', 'doctor']), validate(createVaccinationSchema), vaccinationsController.create);

// POST /api/vaccinations/protocol - Create protocol-based vaccination
router.post('/protocol', authenticate(['admin', 'receptionist', 'doctor']), vaccinationsController.createProtocolBased);

// POST /api/vaccinations/ad-hoc - Create ad-hoc vaccination
router.post('/ad-hoc', authenticate(['admin', 'receptionist', 'doctor']), vaccinationsController.createAdHoc);

// GET /api/vaccinations/pet/:petId/type - Get vaccinations by type
router.get('/pet/:petId/type', authenticate(), vaccinationsController.getByType);

/**
 * @swagger
 * /api/vaccinations/{id}:
 *   put:
 *     summary: Update vaccination record
 *     tags: [Vaccinations]
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
 *         description: Vaccination record updated successfully
 */
router.put('/:id', authenticate(['admin', 'receptionist', 'doctor']), validate(updateVaccinationSchema), vaccinationsController.update);

/**
 * @swagger
 * /api/vaccinations/{id}:
 *   delete:
 *     summary: Delete vaccination record
 *     tags: [Vaccinations]
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
 *         description: Vaccination record deleted successfully
 */
router.delete('/:id', authenticate(['admin', 'receptionist', 'doctor']), validate(getVaccinationByIdSchema), vaccinationsController.delete);

module.exports = router;
