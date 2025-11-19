const appointmentsService = require('../services/appointments.service');
const asyncHandler = require('../utils/async-handler');
const { notificationEvents, EVENTS } = require('../notifications/notificationEvents');

class AppointmentsController {
  getAll = asyncHandler(async (req, res) => {
    const result = await appointmentsService.getAll(req.query, req.user);
    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.getById(req.params.id);
    res.json({ appointment });
  });

  create = asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.create(req.body, req.user);
    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  });

  update = asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.update(req.params.id, req.body);
    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  });

  updateStatus = asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    const newStatus = req.body.status;
    const user = req.user;

    // Get appointment details first to check ownership
    const appointment = await appointmentsService.getById(appointmentId);

    // If user is a client, enforce restrictions
    if (user.role === 'client') {
      // Check if appointment belongs to this client
      if (appointment.client_id !== user.id) {
        const { ForbiddenError } = require('../utils/errors');
        throw new ForbiddenError('You can only cancel your own appointments');
      }

      // Clients can only cancel appointments
      if (newStatus !== 'cancelled' && newStatus !== 'cancelled_late') {
        const { ForbiddenError } = require('../utils/errors');
        throw new ForbiddenError('Clients can only cancel appointments');
      }
    }

    const updatedAppointment = await appointmentsService.updateStatus(appointmentId, newStatus);

    // Emit notification events
    if (newStatus === 'confirmed') {
      notificationEvents.emit(EVENTS.APPOINTMENT_CONFIRMED, {
        appointmentId: parseInt(appointmentId)
      });
    }

    res.json({
      message: 'Appointment status updated successfully',
      appointment: updatedAppointment
    });
  });

  delete = asyncHandler(async (req, res) => {
    const result = await appointmentsService.delete(req.params.id);
    res.json(result);
  });

  checkAvailability = asyncHandler(async (req, res) => {
    const { doctorId, scheduledAt, durationMinutes } = req.query;
    const isAvailable = await appointmentsService.checkAvailability(
      parseInt(doctorId),
      scheduledAt,
      parseInt(durationMinutes)
    );
    res.json({ isAvailable });
  });

  getAvailableSlots = asyncHandler(async (req, res) => {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        error: 'doctorId and date are required',
        code: 'MISSING_PARAMETERS'
      });
    }

    const slots = await appointmentsService.getAvailableSlots(
      parseInt(doctorId),
      date
    );
    res.json({ slots });
  });

  // Cancel appointment with business logic
  cancelAppointment = asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    const user = req.user;

    const result = await appointmentsService.cancelAppointment(appointmentId, user);
    res.json(result);
  });

  // Request to reschedule appointment
  requestReschedule = asyncHandler(async (req, res) => {
    const appointmentId = req.params.id;
    const { newScheduledAt, clientNote } = req.body;
    const user = req.user;

    const result = await appointmentsService.requestReschedule(
      appointmentId,
      newScheduledAt,
      user,
      clientNote
    );
    res.status(201).json(result);
  });

  // Get all reschedule requests (for receptionist)
  getRescheduleRequests = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const requests = await appointmentsService.getRescheduleRequests(status);
    res.json({ requests });
  });

  // Approve reschedule request
  approveReschedule = asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const user = req.user;

    const result = await appointmentsService.approveReschedule(requestId, user.id);

    // Emit notification event
    notificationEvents.emit(EVENTS.RESCHEDULE_APPROVED, {
      requestId: parseInt(requestId),
      appointmentId: result.appointmentId
    });

    res.json(result);
  });

  // Reject reschedule request
  rejectReschedule = asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const { rejectionReason } = req.body;
    const user = req.user;

    const result = await appointmentsService.rejectReschedule(
      requestId,
      user.id,
      rejectionReason
    );

    // Emit notification event
    notificationEvents.emit(EVENTS.RESCHEDULE_REJECTED, {
      requestId: parseInt(requestId),
      rejectionReason
    });

    res.json(result);
  });
}

module.exports = new AppointmentsController();
