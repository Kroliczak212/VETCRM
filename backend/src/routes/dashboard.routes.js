const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * All dashboard routes require authentication
 */
router.use(authenticate());

/**
 * @route   GET /api/dashboard/admin
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get('/admin', authorize(['admin']), dashboardController.getAdminStatistics);

/**
 * @route   GET /api/dashboard/receptionist
 * @desc    Get receptionist dashboard statistics
 * @access  Private (Admin, Receptionist)
 */
router.get('/receptionist', authorize(['admin', 'receptionist']), dashboardController.getReceptionistStatistics);

/**
 * @route   GET /api/dashboard/doctor
 * @desc    Get doctor dashboard statistics
 * @access  Private (Doctor)
 */
router.get('/doctor', authorize(['doctor']), dashboardController.getDoctorStatistics);

/**
 * @route   GET /api/dashboard/client
 * @desc    Get client dashboard statistics
 * @access  Private (Client)
 */
router.get('/client', authorize(['client']), dashboardController.getClientStatistics);

module.exports = router;
