const express = require('express');
const router = express.Router();
const appointmentReasonsController = require('../controllers/appointment-reasons.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication

// GET /api/appointment-reasons - Get all reasons (with filters)
router.get('/', authenticate(), appointmentReasonsController.getAll);

// GET /api/appointment-reasons/:id - Get reason by ID
router.get('/:id', authenticate(), appointmentReasonsController.getById);

// POST /api/appointment-reasons - Create new reason (admin only)
router.post('/', authenticate(['admin']), appointmentReasonsController.create);

// PUT /api/appointment-reasons/:id - Update reason (admin only)
router.put('/:id', authenticate(['admin']), appointmentReasonsController.update);

// DELETE /api/appointment-reasons/:id - Soft delete reason (admin only)
router.delete('/:id', authenticate(['admin']), appointmentReasonsController.delete);

module.exports = router;
