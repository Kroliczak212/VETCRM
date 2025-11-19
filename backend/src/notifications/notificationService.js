const { sendEmail } = require('./emailService');
const emailConfig = require('../config/email.config');

/**
 * Notification Service
 * Handles sending different types of notification emails
 */

class NotificationService {
  /**
   * Send appointment confirmed email
   * @param {Object} data - { appointmentId, userEmail, userName, petName, doctorName, scheduledAt, reason, location }
   */
  async sendAppointmentConfirmed(data) {
    const { userEmail, userName, petName, doctorName, scheduledAt, reason, location } = data;

    const template = require('./templates/appointmentConfirmed');
    const { subject, html } = template.generate({
      userName,
      petName,
      doctorName,
      scheduledAt,
      reason,
      location,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send appointment rejected email
   * @param {Object} data - { userEmail, userName, petName, doctorName, scheduledAt, rejectionReason }
   */
  async sendAppointmentRejected(data) {
    const { userEmail, userName, petName, doctorName, scheduledAt, rejectionReason } = data;

    const template = require('./templates/appointmentRejected');
    const { subject, html } = template.generate({
      userName,
      petName,
      doctorName,
      scheduledAt,
      rejectionReason,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send reschedule approved email
   * @param {Object} data - { userEmail, userName, petName, doctorName, oldScheduledAt, newScheduledAt, reason }
   */
  async sendRescheduleApproved(data) {
    const { userEmail, userName, petName, doctorName, oldScheduledAt, newScheduledAt, reason } = data;

    const template = require('./templates/rescheduleApproved');
    const { subject, html } = template.generate({
      userName,
      petName,
      doctorName,
      oldScheduledAt,
      newScheduledAt,
      reason,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send reschedule rejected email
   * @param {Object} data - { userEmail, userName, petName, oldScheduledAt, newScheduledAt, rejectionReason }
   */
  async sendRescheduleRejected(data) {
    const { userEmail, userName, petName, oldScheduledAt, newScheduledAt, rejectionReason } = data;

    const template = require('./templates/rescheduleRejected');
    const { subject, html } = template.generate({
      userName,
      petName,
      oldScheduledAt,
      newScheduledAt,
      rejectionReason,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send appointment reminder (24h or 2h before)
   * @param {Object} data - { userEmail, userName, petName, doctorName, scheduledAt, reason, location, hoursUntil }
   */
  async sendAppointmentReminder(data) {
    const { userEmail, userName, petName, doctorName, scheduledAt, reason, location, hoursUntil } = data;

    const template = require('./templates/appointmentReminder');
    const { subject, html } = template.generate({
      userName,
      petName,
      doctorName,
      scheduledAt,
      reason,
      location,
      hoursUntil,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }

  /**
   * Send vaccination reminder
   * @param {Object} data - { userEmail, userName, petName, vaccineName, dueDate, daysUntil }
   */
  async sendVaccinationReminder(data) {
    const { userEmail, userName, petName, vaccineName, dueDate, daysUntil } = data;

    const template = require('./templates/vaccinationReminder');
    const { subject, html } = template.generate({
      userName,
      petName,
      vaccineName,
      dueDate,
      daysUntil,
    });

    await sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
}

module.exports = new NotificationService();
