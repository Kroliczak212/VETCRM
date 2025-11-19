const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/payments.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreatePayment, validateUpdatePayment, validateGetPaymentsQuery } = require('../validators/payments.validator');

/**
 * All payment routes require authentication
 */
router.use(authenticate());

/**
 * @route   GET /api/payments/statistics
 * @desc    Get payment statistics
 * @access  Private (Admin, Receptionist)
 */
router.get('/statistics', authorize(['admin', 'receptionist']), paymentsController.getStatistics);

/**
 * @route   GET /api/payments/appointment/:appointmentId
 * @desc    Get payment by appointment ID
 * @access  Private
 */
router.get('/appointment/:appointmentId', paymentsController.getByAppointmentId);

/**
 * @route   GET /api/payments
 * @desc    Get all payments
 * @access  Private (Admin, Receptionist)
 */
router.get('/', authorize(['admin', 'receptionist']), validateGetPaymentsQuery, paymentsController.getAll);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', paymentsController.getById);

/**
 * @route   POST /api/payments
 * @desc    Create payment
 * @access  Private (Admin, Receptionist)
 */
router.post('/', authorize(['admin', 'receptionist']), validateCreatePayment, paymentsController.create);

/**
 * @route   PATCH /api/payments/:id
 * @desc    Update payment (record payment)
 * @access  Private (Admin, Receptionist)
 */
router.patch('/:id', authorize(['admin', 'receptionist']), validateUpdatePayment, paymentsController.update);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Delete payment
 * @access  Private (Admin)
 */
router.delete('/:id', authorize(['admin']), paymentsController.delete);

module.exports = router;
