const EventEmitter = require('events');

/**
 * Notification Events - Event Emitter Singleton
 * Central event bus for all notification events
 */

class NotificationEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase limit for multiple listeners
  }
}

// Export singleton instance
const notificationEvents = new NotificationEvents();

/**
 * Event Names - Centralized list for type safety
 */
const EVENTS = {
  // Appointment events
  APPOINTMENT_PROPOSED: 'appointment:proposed',
  APPOINTMENT_CONFIRMED: 'appointment:confirmed',
  APPOINTMENT_REJECTED: 'appointment:rejected',
  APPOINTMENT_CANCELLED: 'appointment:cancelled',
  APPOINTMENT_COMPLETED: 'appointment:completed',
  APPOINTMENT_REMINDER_24H: 'appointment:reminder:24h',
  APPOINTMENT_REMINDER_2H: 'appointment:reminder:2h',

  // Reschedule events
  RESCHEDULE_REQUESTED: 'reschedule:requested',
  RESCHEDULE_APPROVED: 'reschedule:approved',
  RESCHEDULE_REJECTED: 'reschedule:rejected',

  // Vaccination events
  VACCINATION_REMINDER: 'vaccination:reminder',

  // Invoice events (future)
  INVOICE_CREATED: 'invoice:created',
};

module.exports = {
  notificationEvents,
  EVENTS,
};
