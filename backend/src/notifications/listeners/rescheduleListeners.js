const { notificationEvents, EVENTS } = require('../notificationEvents');
const notificationService = require('../notificationService');
const { pool } = require('../../config/database');

/**
 * Reschedule Event Listeners
 * Listen for reschedule-related events and send appropriate notifications
 */

/**
 * Handle RESCHEDULE_APPROVED event
 * Triggered when receptionist approves a reschedule request
 */
notificationEvents.on(EVENTS.RESCHEDULE_APPROVED, async (data) => {
  try {
    const { requestId, appointmentId } = data;

    // Fetch reschedule request details with client and appointment info
    const [rows] = await pool.query(
      `SELECT
        rr.*,
        a.reason,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name,
        CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointment_reschedule_requests rr
       JOIN appointments a ON rr.appointment_id = a.id
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       JOIN users doc ON a.doctor_user_id = doc.id
       WHERE rr.id = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      console.error('Reschedule request not found:', requestId);
      return;
    }

    const request = rows[0];

    await notificationService.sendRescheduleApproved({
      userEmail: request.client_email,
      userName: `${request.client_first_name} ${request.client_last_name}`,
      petName: request.pet_name,
      doctorName: request.doctor_name,
      oldScheduledAt: request.old_scheduled_at,
      newScheduledAt: request.new_scheduled_at,
      reason: request.reason,
    });

    console.log(`✅ Reschedule approved email sent for request ${requestId}`);
  } catch (error) {
    console.error('Error sending reschedule approved email:', error);
  }
});

/**
 * Handle RESCHEDULE_REJECTED event
 */
notificationEvents.on(EVENTS.RESCHEDULE_REJECTED, async (data) => {
  try {
    const { requestId, rejectionReason } = data;

    const [rows] = await pool.query(
      `SELECT
        rr.*,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name
       FROM appointment_reschedule_requests rr
       JOIN appointments a ON rr.appointment_id = a.id
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       WHERE rr.id = ?`,
      [requestId]
    );

    if (rows.length === 0) return;

    const request = rows[0];

    await notificationService.sendRescheduleRejected({
      userEmail: request.client_email,
      userName: `${request.client_first_name} ${request.client_last_name}`,
      petName: request.pet_name,
      oldScheduledAt: request.old_scheduled_at,
      newScheduledAt: request.new_scheduled_at,
      rejectionReason,
    });

    console.log(`✅ Reschedule rejected email sent for request ${requestId}`);
  } catch (error) {
    console.error('Error sending reschedule rejected email:', error);
  }
});

console.log('✅ Reschedule event listeners registered');

module.exports = {};
