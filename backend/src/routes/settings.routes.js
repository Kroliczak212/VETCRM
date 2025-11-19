const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * All settings routes require authentication
 */
router.use(authenticate());

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Private (Admin)
 */
router.get('/', authorize(['admin']), settingsController.getAll);

/**
 * @route   POST /api/settings/initialize-defaults
 * @desc    Initialize default settings
 * @access  Private (Admin)
 */
router.post('/initialize-defaults', authorize(['admin']), settingsController.initializeDefaults);

/**
 * @route   GET /api/settings/:key
 * @desc    Get setting by key
 * @access  Private (Admin)
 */
router.get('/:key', authorize(['admin']), settingsController.getByKey);

/**
 * @route   PATCH /api/settings
 * @desc    Update multiple settings at once
 * @access  Private (Admin)
 */
router.patch('/', authorize(['admin']), settingsController.updateBulk);

/**
 * @route   PATCH /api/settings/:key
 * @desc    Update setting by key
 * @access  Private (Admin)
 */
router.patch('/:key', authorize(['admin']), settingsController.update);

/**
 * @route   POST /api/settings
 * @desc    Create new setting
 * @access  Private (Admin)
 */
router.post('/', authorize(['admin']), settingsController.create);

/**
 * @route   DELETE /api/settings/:key
 * @desc    Delete setting
 * @access  Private (Admin)
 */
router.delete('/:key', authorize(['admin']), settingsController.delete);

module.exports = router;
