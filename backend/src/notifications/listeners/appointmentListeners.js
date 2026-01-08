const { notificationEvents, EVENTS } = require('../notificationEvents');
const notificationService = require('../notificationService');
const { pool } = require('../../config/database');

/**
 * Appointment Event Listeners
 * Listen for appointment-related events and send appropriate notifications
 */

/**
 * Handle APPOINTMENT_CONFIRMED event
 * Triggered when receptionist confirms a proposed appointment
 */
notificationEvents.on(EVENTS.APPOINTMENT_CONFIRMED, async (data) => {
  try {
    const { appointmentId } = data;

    const [rows] = await pool.query(
      `SELECT
        a.*,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name,
        CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       JOIN users doc ON a.doctor_user_id = doc.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (rows.length === 0) {
      console.error('Appointment not found:', appointmentId);
      return;
    }

    const appointment = rows[0];

    await notificationService.sendAppointmentConfirmed({
      userEmail: appointment.client_email,
      userName: `${appointment.client_first_name} ${appointment.client_last_name}`,
      petName: appointment.pet_name,
      doctorName: appointment.doctor_name,
      scheduledAt: appointment.scheduled_at,
      reason: appointment.reason,
      location: appointment.location,
    });

    console.log(`✅ Appointment confirmed email sent for appointment ${appointmentId}`);
  } catch (error) {
    console.error('Error sending appointment confirmed email:', error);
  }
});

/**
 * Handle APPOINTMENT_REJECTED event
 */
notificationEvents.on(EVENTS.APPOINTMENT_REJECTED, async (data) => {
  try {
    const { appointmentId, rejectionReason } = data;

    const [rows] = await pool.query(
      `SELECT
        a.*,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name,
        CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       JOIN users doc ON a.doctor_user_id = doc.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (rows.length === 0) return;

    const appointment = rows[0];

    await notificationService.sendAppointmentRejected({
      userEmail: appointment.client_email,
      userName: `${appointment.client_first_name} ${appointment.client_last_name}`,
      petName: appointment.pet_name,
      doctorName: appointment.doctor_name,
      scheduledAt: appointment.scheduled_at,
      rejectionReason,
    });

    console.log(`✅ Appointment rejected email sent for appointment ${appointmentId}`);
  } catch (error) {
    console.error('Error sending appointment rejected email:', error);
  }
});

console.log('✅ Appointment event listeners registered');

module.exports = {};
