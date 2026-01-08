const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointments.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateStatusSchema,
  getAppointmentByIdSchema
} = require('../validators/appointments.validator');

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Appointment scheduling and management
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments (role-based filtering)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: petId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/', authenticate(), appointmentsController.getAll);

/**
 * @swagger
 * /api/appointments/check-availability:
 *   get:
 *     summary: Check doctor availability at specific time
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: scheduledAt
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: durationMinutes
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Availability status
 */
router.get('/check-availability', authenticate(['admin', 'receptionist', 'doctor']), appointmentsController.checkAvailability);

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     summary: Get available time slots for a doctor on a specific date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available time slots
 */
router.get('/available-slots', authenticate(), appointmentsController.getAvailableSlots);

/**
 * @swagger
 * /api/appointments/time-range-all-doctors:
 *   get:
 *     summary: Get time range for all doctors on a specific date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Time range for all doctors
 */
router.get('/time-range-all-doctors', authenticate(['admin', 'receptionist', 'doctor']), appointmentsController.getTimeRangeForAllDoctors);

/**
 * @swagger
 * /api/appointments/doctors-for-slot:
 *   get:
 *     summary: Get doctors working at a specific time slot
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: time
 *         required: true
 *         schema:
 *           type: string
 *           example: "09:00"
 *     responses:
 *       200:
 *         description: List of doctors with availability
 */
router.get('/doctors-for-slot', authenticate(['admin', 'receptionist', 'doctor']), appointmentsController.getDoctorsForSlot);

/**
 * @swagger
 * /api/appointments/doctor-time-range:
 *   get:
 *     summary: Get time range for a specific doctor on a specific date
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Time range for the doctor
 */
router.get('/doctor-time-range', authenticate(['admin', 'receptionist', 'doctor']), appointmentsController.getDoctorTimeRange);

/**
 * @swagger
 * /api/appointments/reschedule-requests:
 *   get:
 *     summary: Get all reschedule requests (for receptionist)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: List of reschedule requests
 */
router.get('/reschedule-requests', authenticate(['admin', 'receptionist']), appointmentsController.getRescheduleRequests);

/**
 * @swagger
 * /api/appointments/reschedule-requests/{id}/approve:
 *   post:
 *     summary: Approve reschedule request
 *     tags: [Appointments]
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
 *         description: Reschedule request approved
 */
router.post('/reschedule-requests/:id/approve', authenticate(['admin', 'receptionist']), appointmentsController.approveReschedule);

/**
 * @swagger
 * /api/appointments/reschedule-requests/{id}/reject:
 *   post:
 *     summary: Reject reschedule request
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reschedule request rejected
 */
router.post('/reschedule-requests/:id/reject', authenticate(['admin', 'receptionist']), appointmentsController.rejectReschedule);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
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
 *         description: Appointment details
 */
router.get('/:id', authenticate(), validate(getAppointmentByIdSchema), appointmentsController.getById);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create new appointment
 *     tags: [Appointments]
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
 *               - doctorId
 *               - scheduledAt
 *               - durationMinutes
 *             properties:
 *               petId:
 *                 type: integer
 *               doctorId:
 *                 type: integer
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               durationMinutes:
 *                 type: integer
 *               reason:
 *                 type: string
 *               location:
 *                 type: string
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       409:
 *         description: Doctor not available at this time
 */
router.post('/', authenticate(['admin', 'receptionist', 'doctor', 'client']), validate(createAppointmentSchema), appointmentsController.create);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     tags: [Appointments]
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
 *         description: Appointment updated successfully
 */
router.put('/:id', authenticate(['admin', 'receptionist', 'doctor']), validate(updateAppointmentSchema), appointmentsController.update);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status
 *     tags: [Appointments]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [proposed, confirmed, in_progress, completed, cancelled, cancelled_late]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/:id/status', authenticate(['admin', 'receptionist', 'doctor', 'client']), validate(updateStatusSchema), appointmentsController.updateStatus);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Delete appointment
 *     tags: [Appointments]
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
 *         description: Appointment deleted successfully
 */
router.delete('/:id', authenticate(['admin']), validate(getAppointmentByIdSchema), appointmentsController.delete);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   post:
 *     summary: Cancel appointment with business logic (time-based rules)
 *     tags: [Appointments]
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
 *         description: Appointment cancelled successfully
 */
router.post('/:id/cancel', authenticate(['client', 'admin', 'receptionist']), appointmentsController.cancelAppointment);

/**
 * @swagger
 * /api/appointments/{id}/reschedule-request:
 *   post:
 *     summary: Request to reschedule appointment
 *     tags: [Appointments]
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
 *             required:
 *               - newScheduledAt
 *             properties:
 *               newScheduledAt:
 *                 type: string
 *                 format: date-time
 *               clientNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reschedule request created
 */
router.post('/:id/reschedule-request', authenticate(['client', 'admin', 'receptionist']), appointmentsController.requestReschedule);

/**
 * @swagger
 * /api/appointments/{id}/force-reschedule:
 *   post:
 *     summary: Force reschedule appointment by staff (receptionist/admin)
 *     description: Directly changes the appointment time and sends email notification to the client
 *     tags: [Appointments]
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
 *             required:
 *               - newScheduledAt
 *             properties:
 *               newScheduledAt:
 *                 type: string
 *                 format: date-time
 *                 description: New appointment date and time
 *               reason:
 *                 type: string
 *                 description: Reason for rescheduling (included in client email)
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 */
router.post('/:id/force-reschedule', authenticate(['admin', 'receptionist']), appointmentsController.forceReschedule);

module.exports = router;
