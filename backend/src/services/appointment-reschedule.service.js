const { pool } = require('../config/database');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const APPOINTMENT_RULES = require('../config/appointmentRules');
const emailService = require('./email.service');

/**
 * Service for handling appointment rescheduling
 * Extracted from AppointmentsService for better separation of concerns
 */
class AppointmentRescheduleService {
  /**
   * Request to reschedule appointment (creates pending request)
   *
   * @param {object} appointment - Full appointment object
   * @param {string} newScheduledAt - New requested time (ISO string)
   * @param {object} user - User object from auth
   * @param {string|null} clientNote - Optional note from client
   * @returns {Promise<object>} Reschedule request result
   */
  async requestReschedule(appointment, newScheduledAt, user, clientNote = null) {
    if (user.role === 'client' && appointment.client_id !== user.id) {
      throw new ForbiddenError('You can only reschedule your own appointments');
    }

    if (['cancelled', 'cancelled_late', 'completed'].includes(appointment.status)) {
      throw new ValidationError(`Cannot reschedule ${appointment.status} appointment`);
    }

    const rescheduleCheck = APPOINTMENT_RULES.canReschedule(appointment.scheduled_at);

    if (!rescheduleCheck.canReschedule) {
      throw new ValidationError(rescheduleCheck.message);
    }

    const newDateTime = new Date(newScheduledAt);
    if (newDateTime < new Date()) {
      throw new ValidationError('New appointment time must be in the future');
    }

    const [existingRequests] = await pool.query(
      `SELECT id FROM appointment_reschedule_requests
       WHERE appointment_id = ? AND status = 'pending'`,
      [appointment.id]
    );

    if (existingRequests.length > 0) {
      throw new ValidationError('There is already a pending reschedule request for this appointment');
    }

    const [result] = await pool.query(
      `INSERT INTO appointment_reschedule_requests
       (appointment_id, old_scheduled_at, new_scheduled_at, requested_by, client_note)
       VALUES (?, ?, ?, ?, ?)`,
      [appointment.id, appointment.scheduled_at, newScheduledAt, user.id, clientNote]
    );

    return {
      message: 'Reschedule request submitted successfully. Awaiting receptionist approval.',
      requestId: result.insertId,
      oldTime: appointment.scheduled_at,
      newTime: newScheduledAt,
      status: 'pending',
    };
  }

  /**
   * Get all reschedule requests (for receptionist)
   *
   * @param {string|null} status - Filter by status ('pending', 'approved', 'rejected')
   * @returns {Promise<Array>} List of reschedule requests
   */
  async getRescheduleRequests(status = null) {
    let query = `
      SELECT
        rr.*,
        a.reason as appointment_reason,
        CONCAT(client.first_name, ' ', client.last_name) as client_name,
        client.phone as client_phone,
        CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name,
        p.name as pet_name,
        p.species,
        CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name
      FROM appointment_reschedule_requests rr
      JOIN appointments a ON rr.appointment_id = a.id
      JOIN users client ON rr.requested_by = client.id
      JOIN users doctor ON a.doctor_user_id = doctor.id
      JOIN pets p ON a.pet_id = p.id
      LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND rr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY rr.requested_at DESC';

    const [requests] = await pool.query(query, params);
    return requests;
  }

  /**
   * Get reschedule request by ID
   *
   * @param {number} requestId
   * @returns {Promise<object>} Reschedule request with full details
   */
  async getRequestById(requestId) {
    const [requests] = await pool.query(
      `SELECT rr.*, a.status as appointment_status,
              CONCAT(client.first_name, ' ', client.last_name) as client_name,
              client.email as client_email,
              CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name,
              p.name as pet_name
       FROM appointment_reschedule_requests rr
       JOIN appointments a ON rr.appointment_id = a.id
       JOIN users client ON rr.requested_by = client.id
       JOIN users doctor ON a.doctor_user_id = doctor.id
       JOIN pets p ON a.pet_id = p.id
       WHERE rr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      throw new NotFoundError('Reschedule request not found');
    }

    return requests[0];
  }

  /**
   * Approve reschedule request
   *
   * @param {number} requestId
   * @param {number} reviewerUserId - Receptionist user ID
   * @returns {Promise<object>} Approval result
   */
  async approveReschedule(requestId, reviewerUserId) {
    const request = await this.getRequestById(requestId);

    if (request.status !== 'pending') {
      throw new ValidationError(`Request has already been ${request.status}`);
    }

    // Check if appointment is still valid
    if (['cancelled', 'cancelled_late', 'completed'].includes(request.appointment_status)) {
      throw new ValidationError(`Cannot reschedule ${request.appointment_status} appointment`);
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE appointments
         SET scheduled_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [request.new_scheduled_at, request.appointment_id]
      );

      await connection.query(
        `UPDATE appointment_reschedule_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
         WHERE id = ?`,
        [reviewerUserId, requestId]
      );

      await connection.commit();

      return {
        message: 'Reschedule request approved successfully',
        appointmentId: request.appointment_id,
        newTime: request.new_scheduled_at,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject reschedule request
   *
   * @param {number} requestId
   * @param {number} reviewerUserId - Receptionist user ID
   * @param {string|null} rejectionReason - Reason for rejection
   * @returns {Promise<object>} Rejection result
   */
  async rejectReschedule(requestId, reviewerUserId, rejectionReason = null) {
    const request = await this.getRequestById(requestId);

    if (request.status !== 'pending') {
      throw new ValidationError(`Request has already been ${request.status}`);
    }

    await pool.query(
      `UPDATE appointment_reschedule_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
      [reviewerUserId, rejectionReason, requestId]
    );

    return {
      message: 'Reschedule request rejected',
      appointmentId: request.appointment_id,
      reason: rejectionReason,
    };
  }

  /**
   * Get pending reschedule requests count
   *
   * @returns {Promise<number>}
   */
  async getPendingCount() {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM appointment_reschedule_requests WHERE status = ?',
      ['pending']
    );
    return result[0].count;
  }

  /**
   * Get reschedule requests for specific appointment
   *
   * @param {number} appointmentId
   * @returns {Promise<Array>}
   */
  async getRequestsForAppointment(appointmentId) {
    const [requests] = await pool.query(
      `SELECT rr.*,
              CONCAT(reviewer.first_name, ' ', reviewer.last_name) as reviewer_name
       FROM appointment_reschedule_requests rr
       LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
       WHERE rr.appointment_id = ?
       ORDER BY rr.requested_at DESC`,
      [appointmentId]
    );
    return requests;
  }

  /**
   * Force reschedule appointment by staff (receptionist/admin)
   * Directly changes the appointment time without requiring client approval
   * Sends email notification to the client
   *
   * @param {number} appointmentId
   * @param {string} newScheduledAt - New appointment time (ISO string)
   * @param {number} staffUserId - Staff member performing the reschedule
   * @param {string|null} reason - Reason for rescheduling
   * @param {number|null} newDoctorId - Optional new doctor ID (if changing doctor)
   * @returns {Promise<object>} Result with old and new times
   */
  async forceReschedule(appointmentId, newScheduledAt, staffUserId, reason = null, newDoctorId = null) {
    // Get full appointment details
    const [appointments] = await pool.query(
      `SELECT a.*,
              CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name,
              p.name as pet_name,
              p.owner_user_id as client_id,
              client.email as client_email,
              client.first_name as client_first_name
       FROM appointments a
       JOIN users doctor ON a.doctor_user_id = doctor.id
       JOIN pets p ON a.pet_id = p.id
       JOIN users client ON p.owner_user_id = client.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (appointments.length === 0) {
      throw new NotFoundError('Appointment not found');
    }

    const appointment = appointments[0];

    // Check if appointment can be rescheduled
    if (['cancelled', 'cancelled_late', 'completed'].includes(appointment.status)) {
      throw new ValidationError(`Cannot reschedule ${appointment.status} appointment`);
    }

    const newDateTime = new Date(newScheduledAt);
    if (newDateTime < new Date()) {
      throw new ValidationError('New appointment time must be in the future');
    }

    // Validate new date is at least 7 days from the original appointment date
    const originalDate = new Date(appointment.scheduled_at);
    const daysDifference = Math.floor((newDateTime.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

    if (Math.abs(daysDifference) < 7) {
      throw new ValidationError('Nowy termin musi byc odlegly o co najmniej 7 dni od obecnego terminu wizyty');
    }

    const oldScheduledAt = appointment.scheduled_at;
    const oldDoctorId = appointment.doctor_user_id;
    const targetDoctorId = newDoctorId || oldDoctorId;

    // Get new doctor name if doctor is being changed
    let newDoctorName = appointment.doctor_name;
    if (newDoctorId && newDoctorId !== oldDoctorId) {
      const [doctors] = await pool.query(
        `SELECT CONCAT(first_name, ' ', last_name) as doctor_name FROM users WHERE id = ? AND role_id = 3`,
        [newDoctorId]
      );
      if (doctors.length === 0) {
        throw new ValidationError('Wybrany lekarz nie istnieje');
      }
      newDoctorName = doctors[0].doctor_name;
    }

    // Update appointment directly (with optional doctor change)
    if (newDoctorId && newDoctorId !== oldDoctorId) {
      await pool.query(
        `UPDATE appointments
         SET scheduled_at = ?, doctor_user_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [newScheduledAt, newDoctorId, appointmentId]
      );
    } else {
      await pool.query(
        `UPDATE appointments
         SET scheduled_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [newScheduledAt, appointmentId]
      );
    }

    // Cancel any pending reschedule requests for this appointment
    await pool.query(
      `UPDATE appointment_reschedule_requests
       SET status = 'cancelled', reviewed_by = ?, reviewed_at = NOW(),
           rejection_reason = 'Termin zmieniony bezpośrednio przez personel'
       WHERE appointment_id = ? AND status = 'pending'`,
      [staffUserId, appointmentId]
    );

    // Send email notification to client
    const doctorChanged = newDoctorId && newDoctorId !== oldDoctorId;
    try {
      await emailService.sendAppointmentRescheduledByStaff(
        { ...appointment, doctor_name: newDoctorName },
        appointment.client_email,
        oldScheduledAt,
        newScheduledAt,
        reason,
        doctorChanged ? { oldDoctorName: appointment.doctor_name, newDoctorName } : null
      );
    } catch (emailError) {
      console.error('Failed to send reschedule notification email:', emailError.message);
      // Don't throw - the reschedule was successful, email failure shouldn't break the flow
    }

    return {
      message: 'Appointment rescheduled successfully. Client has been notified via email.',
      appointmentId,
      oldTime: oldScheduledAt,
      newTime: newScheduledAt,
      doctorChanged,
      newDoctorId: doctorChanged ? newDoctorId : null,
      newDoctorName: doctorChanged ? newDoctorName : null,
      clientNotified: true,
    };
  }
}

module.exports = new AppointmentRescheduleService();
