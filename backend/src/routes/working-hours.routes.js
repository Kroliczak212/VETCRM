const express = require('express');
const router = express.Router();
const workingHoursController = require('../controllers/working-hours.controller');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Working Hours
 *   description: Default weekly working hours for doctors (admin-managed)
 */

// GET all working hours (anyone authenticated can view)
router.get('/', authenticate(), workingHoursController.getAll);

// GET working hours by ID
router.get('/:id', authenticate(), workingHoursController.getById);

// GET working hours for specific doctor
router.get('/doctor/:doctorId', authenticate(), workingHoursController.getByDoctorId);

// POST create working hours (admin and doctor - doctor can only create for themselves)
router.post('/', authenticate(['admin', 'doctor']), workingHoursController.create);

// POST bulk create working hours (admin and doctor - doctor can only create for themselves)
router.post('/bulk', authenticate(['admin', 'doctor']), workingHoursController.bulkCreate);

// PUT update working hours (admin and doctor - doctor can only update their own)
router.put('/:id', authenticate(['admin', 'doctor']), workingHoursController.update);

// DELETE soft delete working hours (admin and doctor - doctor can only delete their own)
router.delete('/:id', authenticate(['admin', 'doctor']), workingHoursController.delete);

// DELETE hard delete working hours (admin only - use with caution)
router.delete('/:id/hard', authenticate(['admin']), workingHoursController.hardDelete);

module.exports = router;
