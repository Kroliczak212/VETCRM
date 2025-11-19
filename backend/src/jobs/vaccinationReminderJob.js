const cron = require('node-cron');
const { pool } = require('../config/database');
const notificationService = require('../notifications/notificationService');

/**
 * Vaccination Reminder Cron Job
 * Runs daily and checks for vaccinations that are due in 7 days
 *
 * - Sends reminder 7 days before vaccination due date based on schedules
 * - Uses pet_vaccination_schedules table as source of truth
 * - Includes link to book appointment directly
 */

const sendVaccinationReminders = async () => {
  try {
    console.log('💉 Running vaccination reminder job...');

    // Find vaccination schedules due in 6-8 days (active schedules only)
    const [schedules] = await pool.query(
      `SELECT
        pvs.id as schedule_id,
        pvs.next_due_date,
        pvs.next_dose_number,
        vp.name as protocol_name,
        vp.number_of_doses as total_doses,
        vp.is_required,
        p.id as pet_id,
        p.name as pet_name,
        u.id as owner_id,
        u.email as owner_email,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name
       FROM pet_vaccination_schedules pvs
       JOIN vaccination_protocols vp ON pvs.protocol_id = vp.id
       JOIN pets p ON pvs.pet_id = p.id
       JOIN users u ON p.owner_user_id = u.id
       WHERE pvs.is_active = TRUE
         AND pvs.is_completed = FALSE
         AND pvs.next_due_date BETWEEN CURDATE() + INTERVAL 6 DAY AND CURDATE() + INTERVAL 8 DAY`
    );

    console.log(`📧 Found ${schedules.length} vaccination schedules needing reminder`);

    for (const schedule of schedules) {
      try {
        // Calculate days until due
        const dueDate = new Date(schedule.next_due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Include dose info if it's part of a series
        const vaccineDisplayName = schedule.total_doses > 1
          ? `${schedule.protocol_name} (dawka ${schedule.next_dose_number}/${schedule.total_doses})`
          : schedule.protocol_name;

        await notificationService.sendVaccinationReminder({
          userEmail: schedule.owner_email,
          userName: `${schedule.owner_first_name} ${schedule.owner_last_name}`,
          petName: schedule.pet_name,
          petId: schedule.pet_id,
          scheduleId: schedule.schedule_id,
          vaccineName: vaccineDisplayName,
          dueDate: schedule.next_due_date,
          daysUntil,
          isRequired: schedule.is_required,
        });

        console.log(`✅ Vaccination reminder sent for schedule ${schedule.schedule_id} (${schedule.protocol_name})`);
      } catch (error) {
        console.error(`❌ Failed to send vaccination reminder for schedule ${schedule.schedule_id}:`, error);
      }
    }

    console.log('✅ Vaccination reminder job completed');
  } catch (error) {
    console.error('❌ Vaccination reminder job failed:', error);
  }
};

/**
 * Start cron job
 * Runs daily at 8:00 AM
 */
const startVaccinationReminderJob = () => {
  // Schedule: every day at 8:00 AM
  cron.schedule('0 8 * * *', sendVaccinationReminders);
  console.log('✅ Vaccination reminder cron job scheduled (daily at 8:00 AM)');
};

module.exports = { startVaccinationReminderJob, sendVaccinationReminders };
