/**
 * Appointment Rules Configuration
 *
 * Defines business rules for appointment cancellations and rescheduling
 */

const APPOINTMENT_RULES = {
  // Cancellation rules (in hours)
  CANCEL_NO_PENALTY_HOURS: 72,         // 3 days = cancel without penalty
  CANCEL_WARNING_HOURS: 48,            // 2 days = warning but no penalty
  CANCEL_LATE_PENALTY_HOURS: 24,       // 1 day = late cancellation + fee
  CANCEL_BLOCKED_HOURS: 24,            // < 1 day = cannot cancel online

  // Reschedule rules (in hours)
  RESCHEDULE_MIN_HOURS_BEFORE: 48,     // minimum 48h before appointment to reschedule
  RESCHEDULE_REQUIRES_APPROVAL: true,  // requires receptionist approval

  // Fees (in PLN)
  LATE_CANCELLATION_FEE: 50.00,        // 50 PLN for late cancellation

  /**
   * Calculate hours until appointment
   * @param {Date|string} scheduledAt - Appointment scheduled time
   * @returns {number} Hours until appointment
   */
  getHoursUntilAppointment(scheduledAt) {
    const now = new Date();
    const appointmentDate = new Date(scheduledAt);
    const diffMs = appointmentDate - now;
    return diffMs / (1000 * 60 * 60); // Convert to hours
  },

  /**
   * Determine cancellation type based on time until appointment
   * @param {Date|string} scheduledAt - Appointment scheduled time
   * @returns {Object} { canCancel: boolean, status: string, hasFee: boolean, message: string }
   */
  getCancellationType(scheduledAt) {
    const hoursUntil = this.getHoursUntilAppointment(scheduledAt);

    if (hoursUntil < 0) {
      return {
        canCancel: false,
        status: null,
        hasFee: false,
        message: 'Wizyta już się odbyła'
      };
    }

    if (hoursUntil < this.CANCEL_BLOCKED_HOURS) {
      return {
        canCancel: false,
        status: null,
        hasFee: false,
        message: `Wizyta odbywa się za mniej niż ${this.CANCEL_BLOCKED_HOURS}h. Anulowanie online nie jest możliwe. Skontaktuj się z kliniką telefonicznie.`
      };
    }

    if (hoursUntil < this.CANCEL_LATE_PENALTY_HOURS) {
      return {
        canCancel: true,
        status: 'cancelled_late',
        hasFee: true,
        fee: this.LATE_CANCELLATION_FEE,
        message: `PÓŹNE ANULOWANIE: Za anulowanie wizyty na mniej niż ${this.CANCEL_LATE_PENALTY_HOURS}h przed terminem zostanie naliczona opłata manipulacyjna w wysokości ${this.LATE_CANCELLATION_FEE} zł. Opłata zostanie doliczona przez recepcjonistę przy następnej wizycie.`
      };
    }

    if (hoursUntil < this.CANCEL_WARNING_HOURS) {
      return {
        canCancel: true,
        status: 'cancelled',
        hasFee: false,
        message: `UWAGA: Anulujesz wizytę na mniej niż ${Math.floor(this.CANCEL_WARNING_HOURS / 24)} dni przed terminem. Prosimy o zgłaszanie anulowania wcześniej. Tym razem anulowanie bez opłaty.`
      };
    }

    if (hoursUntil < this.CANCEL_NO_PENALTY_HOURS) {
      return {
        canCancel: true,
        status: 'cancelled',
        hasFee: false,
        message: `UWAGA: Anulujesz wizytę na mniej niż ${Math.floor(this.CANCEL_NO_PENALTY_HOURS / 24)} dni przed terminem. Prosimy o zgłaszanie anulowania wcześniej.`
      };
    }

    return {
      canCancel: true,
      status: 'cancelled',
      hasFee: false,
      message: 'Możesz anulować wizytę bez konsekwencji.'
    };
  },

  /**
   * Check if appointment can be rescheduled
   * @param {Date|string} scheduledAt - Appointment scheduled time
   * @returns {Object} { canReschedule: boolean, message: string }
   */
  canReschedule(scheduledAt) {
    const hoursUntil = this.getHoursUntilAppointment(scheduledAt);

    if (hoursUntil < 0) {
      return {
        canReschedule: false,
        message: 'Wizyta już się odbyła'
      };
    }

    if (hoursUntil < this.RESCHEDULE_MIN_HOURS_BEFORE) {
      return {
        canReschedule: false,
        message: `Wizyta odbywa się za mniej niż ${this.RESCHEDULE_MIN_HOURS_BEFORE}h. Zmiana terminu online nie jest możliwa. Skontaktuj się z kliniką telefonicznie.`
      };
    }

    return {
      canReschedule: true,
      message: 'Możesz zaproponować nowy termin. Zmiana wymaga zatwierdzenia przez recepcję.'
    };
  },

  /**
   * Format hours to human-readable time
   * @param {number} hours - Number of hours
   * @returns {string} Formatted time string
   */
  formatTimeRemaining(hours) {
    if (hours < 0) return 'Wizyta już się odbyła';

    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    const minutes = Math.floor((hours % 1) * 60);

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'dzień' : 'dni'}`);
    if (remainingHours > 0) parts.push(`${remainingHours} ${remainingHours === 1 ? 'godzina' : 'godzin'}`);
    if (minutes > 0 && days === 0) parts.push(`${minutes} ${minutes === 1 ? 'minuta' : 'minut'}`);

    return parts.length > 0 ? parts.join(' ') : '0 minut';
  }
};

module.exports = APPOINTMENT_RULES;
