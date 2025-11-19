const cron = require('node-cron');
const { pool } = require('../config/database');
const notificationService = require('../notifications/notificationService');

/**
 * Appointment Reminder Cron Job
 * Runs every hour and checks for appointments that need reminders
 *
 * - 24h reminder: sent when appointment is 23-25 hours away
 * - 2h reminder: sent when appointment is 1.5-2.5 hours away
 */

const sendReminders = async () => {
  try {
    console.log('🔔 Running appointment reminder job...');

    // Find appointments that need 24h reminders (not yet sent)
    const [reminders24h] = await pool.query(
      `SELECT
        a.id,
        a.scheduled_at,
        a.reason,
        a.location,
        a.reminder_24h_sent,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name,
        CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       JOIN users doc ON a.doctor_user_id = doc.id
       WHERE a.status IN ('confirmed', 'proposed')
         AND a.reminder_24h_sent = FALSE
         AND a.scheduled_at BETWEEN NOW() + INTERVAL 23 HOUR AND NOW() + INTERVAL 25 HOUR`
    );

    console.log(`📧 Found ${reminders24h.length} appointments needing 24h reminder`);

    for (const appointment of reminders24h) {
      try {
        await notificationService.sendAppointmentReminder({
          userEmail: appointment.client_email,
          userName: `${appointment.client_first_name} ${appointment.client_last_name}`,
          petName: appointment.pet_name,
          doctorName: appointment.doctor_name,
          scheduledAt: appointment.scheduled_at,
          reason: appointment.reason,
          location: appointment.location,
          hoursUntil: 24,
        });

        // Mark as sent
        await pool.query('UPDATE appointments SET reminder_24h_sent = TRUE WHERE id = ?', [appointment.id]);

        console.log(`✅ 24h reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        console.error(`❌ Failed to send 24h reminder for appointment ${appointment.id}:`, error);
      }
    }

    // Find appointments that need 2h reminders (not yet sent)
    const [reminders2h] = await pool.query(
      `SELECT
        a.id,
        a.scheduled_at,
        a.reason,
        a.location,
        a.reminder_2h_sent,
        u.email as client_email,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        p.name as pet_name,
        CONCAT(doc.first_name, ' ', doc.last_name) as doctor_name
       FROM appointments a
       JOIN pets p ON a.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       JOIN users doc ON a.doctor_user_id = doc.id
       WHERE a.status IN ('confirmed', 'proposed')
         AND a.reminder_2h_sent = FALSE
         AND a.scheduled_at BETWEEN NOW() + INTERVAL 90 MINUTE AND NOW() + INTERVAL 150 MINUTE`
    );

    console.log(`📧 Found ${reminders2h.length} appointments needing 2h reminder`);

    for (const appointment of reminders2h) {
      try {
        await notificationService.sendAppointmentReminder({
          userEmail: appointment.client_email,
          userName: `${appointment.client_first_name} ${appointment.client_last_name}`,
          petName: appointment.pet_name,
          doctorName: appointment.doctor_name,
          scheduledAt: appointment.scheduled_at,
          reason: appointment.reason,
          location: appointment.location,
          hoursUntil: 2,
        });

        // Mark as sent
        await pool.query('UPDATE appointments SET reminder_2h_sent = TRUE WHERE id = ?', [appointment.id]);

        console.log(`✅ 2h reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        console.error(`❌ Failed to send 2h reminder for appointment ${appointment.id}:`, error);
      }
    }

    console.log('✅ Appointment reminder job completed');
  } catch (error) {
    console.error('❌ Appointment reminder job failed:', error);
  }
};

/**
 * Start cron job
 * Runs every hour at minute 0
 * Example: 08:00, 09:00, 10:00, etc.
 */
const startAppointmentReminderJob = () => {
  // Schedule: every hour at minute 0
  cron.schedule('0 * * * *', sendReminders);
  console.log('✅ Appointment reminder cron job scheduled (every hour at :00)');
};

module.exports = { startAppointmentReminderJob, sendReminders };
