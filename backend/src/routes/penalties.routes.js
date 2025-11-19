const express = require('express');
const router = express.Router();
const penaltiesController = require('../controllers/penalties.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreatePenalty, validateGetPenaltiesQuery } = require('../validators/penalties.validator');

/**
 * All penalty routes require authentication
 */
router.use(authenticate());

/**
 * @route   GET /api/penalties/statistics
 * @desc    Get penalty statistics
 * @access  Private (Admin, Receptionist)
 */
router.get('/statistics', authorize(['admin', 'receptionist']), penaltiesController.getStatistics);

/**
 * @route   GET /api/penalties/client/:clientId
 * @desc    Get penalties by client ID
 * @access  Private
 */
router.get('/client/:clientId', penaltiesController.getByClientId);

/**
 * @route   GET /api/penalties
 * @desc    Get all penalties
 * @access  Private (Admin, Receptionist)
 */
router.get('/', authorize(['admin', 'receptionist']), validateGetPenaltiesQuery, penaltiesController.getAll);

/**
 * @route   GET /api/penalties/:id
 * @desc    Get penalty by ID
 * @access  Private
 */
router.get('/:id', penaltiesController.getById);

/**
 * @route   POST /api/penalties
 * @desc    Create penalty
 * @access  Private (Admin, Receptionist)
 */
router.post('/', authorize(['admin', 'receptionist']), validateCreatePenalty, penaltiesController.create);

/**
 * @route   DELETE /api/penalties/:id
 * @desc    Delete penalty
 * @access  Private (Admin)
 */
router.delete('/:id', authorize(['admin']), penaltiesController.delete);

module.exports = router;
