const { pool } = require('../config/database');
const { ValidationError, ForbiddenError } = require('../utils/errors');
const APPOINTMENT_RULES = require('../config/appointmentRules');

/**
 * Service for handling appointment cancellations
 * Extracted from AppointmentsService for better separation of concerns
 */
class AppointmentCancellationService {
  /**
   * Cancel appointment with business logic (time-based rules)
   *
   * @param {object} appointment - Full appointment object (from getById)
   * @param {object} user - User object from auth
   * @returns {Promise<object>} Cancellation result
   */
  async cancelAppointment(appointment, user) {
    // Check ownership (client can only cancel their own appointments)
    if (user.role === 'client' && appointment.client_id !== user.id) {
      throw new ForbiddenError('You can only cancel your own appointments');
    }

    if (appointment.status === 'cancelled' || appointment.status === 'cancelled_late') {
      throw new ValidationError('Appointment is already cancelled');
    }

    if (appointment.status === 'completed') {
      throw new ValidationError('Cannot cancel completed appointment');
    }

    const cancellationType = APPOINTMENT_RULES.getCancellationType(appointment.scheduled_at);

    if (!cancellationType.canCancel) {
      throw new ValidationError(cancellationType.message);
    }

    const updateData = {
      status: cancellationType.status,
    };

    if (cancellationType.hasFee) {
      const hoursUntil = APPOINTMENT_RULES.getHoursUntilAppointment(appointment.scheduled_at);
      updateData.late_cancellation_fee = cancellationType.fee;
      updateData.late_cancellation_fee_paid = false;
      updateData.late_cancellation_fee_note = `Anulowano ${hoursUntil.toFixed(1)}h przed wizytą`;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);

      await connection.query(
        `UPDATE appointments SET ${updateFields}, updated_at = NOW() WHERE id = ?`,
        [...updateValues, appointment.id]
      );

      await connection.commit();

      return {
        message: 'Appointment cancelled successfully',
        status: cancellationType.status,
        hasFee: cancellationType.hasFee,
        fee: cancellationType.fee || null,
        warning: cancellationType.message,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get cancellation preview (what would happen if user cancels)
   * Useful for showing warning to user before confirmation
   *
   * @param {object} appointment - Appointment object
   * @returns {object} Cancellation preview info
   */
  getCancellationPreview(appointment) {
    const cancellationType = APPOINTMENT_RULES.getCancellationType(appointment.scheduled_at);
    const hoursUntil = APPOINTMENT_RULES.getHoursUntilAppointment(appointment.scheduled_at);

    return {
      canCancel: cancellationType.canCancel,
      status: cancellationType.status,
      hasFee: cancellationType.hasFee,
      fee: cancellationType.fee || null,
      message: cancellationType.message,
      hoursUntilAppointment: hoursUntil,
      timeRemaining: APPOINTMENT_RULES.formatTimeRemaining(hoursUntil)
    };
  }

  /**
   * Check if appointment can be cancelled
   *
   * @param {object} appointment
   * @param {object} user
   * @returns {{canCancel: boolean, reason: string|null}}
   */
  canCancel(appointment, user) {
    // Check ownership
    if (user.role === 'client' && appointment.client_id !== user.id) {
      return { canCancel: false, reason: 'You can only cancel your own appointments' };
    }

    // Check status
    if (appointment.status === 'cancelled' || appointment.status === 'cancelled_late') {
      return { canCancel: false, reason: 'Appointment is already cancelled' };
    }

    if (appointment.status === 'completed') {
      return { canCancel: false, reason: 'Cannot cancel completed appointment' };
    }

    // Check time-based rules
    const cancellationType = APPOINTMENT_RULES.getCancellationType(appointment.scheduled_at);

    return {
      canCancel: cancellationType.canCancel,
      reason: cancellationType.canCancel ? null : cancellationType.message
    };
  }
}

module.exports = new AppointmentCancellationService();
