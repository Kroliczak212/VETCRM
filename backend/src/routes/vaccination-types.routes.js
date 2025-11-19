const express = require('express');
const router = express.Router();
const vaccinationTypesController = require('../controllers/vaccination-types.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication

// GET /api/vaccination-types - Get all types (with filters: species, isRequired, isActive)
router.get('/', authenticate(), vaccinationTypesController.getAll);

// GET /api/vaccination-types/:id - Get type by ID
router.get('/:id', authenticate(), vaccinationTypesController.getById);

// POST /api/vaccination-types - Create new type (admin only)
router.post('/', authenticate(['admin']), vaccinationTypesController.create);

// PUT /api/vaccination-types/:id - Update type (admin only)
router.put('/:id', authenticate(['admin']), vaccinationTypesController.update);

// DELETE /api/vaccination-types/:id - Soft delete type (admin only)
router.delete('/:id', authenticate(['admin']), vaccinationTypesController.delete);

module.exports = router;
