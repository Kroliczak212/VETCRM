const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

/**
 * Service for managing appointment slot availability
 * Extracted from AppointmentsService for better separation of concerns
 */
class SlotAvailabilityService {
  /**
   * Check doctor availability at specific time
   *
   * @param {number} doctorId - Doctor's user ID
   * @param {string} scheduledAt - ISO datetime string
   * @param {number} durationMinutes - Appointment duration
   * @param {number|null} excludeAppointmentId - Appointment ID to exclude (for updates)
   * @returns {Promise<boolean>} True if slot is available
   */
  async checkAvailability(doctorId, scheduledAt, durationMinutes, excludeAppointmentId = null) {
    const mysqlDatetime = new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ');

    let query = `
      SELECT id FROM appointments
      WHERE doctor_user_id = ?
      AND scheduled_at = ?
      AND status NOT IN ('cancelled', 'cancelled_late')
    `;
    const params = [doctorId, mysqlDatetime];

    if (excludeAppointmentId) {
      query += ' AND id != ?';
      params.push(excludeAppointmentId);
    }

    const [conflicts] = await pool.query(query, params);
    return conflicts.length === 0;
  }

  /**
   * Check for overlapping appointments (more thorough than exact time check)
   *
   * @param {number} doctorId
   * @param {string} scheduledAt - Start time
   * @param {number} durationMinutes
   * @param {number|null} excludeAppointmentId
   * @returns {Promise<{hasConflict: boolean, conflictingAppointments: Array}>}
   */
  async checkForOverlap(doctorId, scheduledAt, durationMinutes, excludeAppointmentId = null) {
    const mysqlDatetime = new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ');
    const endTime = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60000)
      .toISOString().slice(0, 19).replace('T', ' ');

    let query = `
      SELECT id, scheduled_at, duration_minutes FROM appointments
      WHERE doctor_user_id = ?
      AND status NOT IN ('cancelled', 'cancelled_late')
      AND (
        (scheduled_at <= ? AND DATE_ADD(scheduled_at, INTERVAL duration_minutes MINUTE) > ?)
        OR (scheduled_at < ? AND scheduled_at >= ?)
      )
    `;
    const params = [doctorId, mysqlDatetime, mysqlDatetime, endTime, mysqlDatetime];

    if (excludeAppointmentId) {
      query += ' AND id != ?';
      params.push(excludeAppointmentId);
    }

    const [conflicts] = await pool.query(query, params);

    return {
      hasConflict: conflicts.length > 0,
      conflictingAppointments: conflicts
    };
  }

  /**
   * Get available time slots for a doctor on a specific date
   * Priority: schedules (date-specific) > working_hours (default) > is_active check
   * Each slot is 60 minutes (45 min appointment + 15 min break)
   *
   * @param {number} doctorId - Doctor's user ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {object|null} user - User object for role-based time blocking
   * @returns {Promise<Array<{time: string, available: boolean}>>} Array of time slots
   */
  async getAvailableSlots(doctorId, date, user = null) {
    console.log(`[getAvailableSlots] Called with doctorId=${doctorId}, date=${date}, userRole=${user?.role || 'none'}`);

    const [doctors] = await pool.query(
      `SELECT u.id, u.is_active FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = ?`,
      [doctorId, 'doctor']
    );

    if (doctors.length === 0) {
      throw new NotFoundError('Doctor not found');
    }

    if (!doctors[0].is_active) {
      return [];
    }

    const [scheduleOverride] = await pool.query(
      `SELECT start_time, end_time, status
       FROM schedules
       WHERE doctor_user_id = ?
       AND date = ?
       AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 1`,
      [doctorId, date]
    );

    let start_time, end_time;

    if (scheduleOverride.length > 0) {
      start_time = scheduleOverride[0].start_time;
      end_time = scheduleOverride[0].end_time;

      // Check if it's a day off (00:00:00 - 00:00:00)
      if (start_time === '00:00:00' && end_time === '00:00:00') {
        return [];
      }
    } else {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      const [workingHours] = await pool.query(
        `SELECT start_time, end_time FROM working_hours
         WHERE doctor_user_id = ? AND day_of_week = ? AND is_active = TRUE`,
        [doctorId, dayName]
      );

      if (workingHours.length === 0) {
        return [];
      }

      start_time = workingHours[0].start_time;
      end_time = workingHours[0].end_time;
    }

    const [startHour, startMinute] = start_time.split(':').map(Number);
    const [endHour, endMinute] = end_time.split(':').map(Number);

    if (startHour === endHour && startMinute === endMinute) {
      return [];
    }

    const [existingAppointments] = await pool.query(
      `SELECT scheduled_at FROM appointments
       WHERE doctor_user_id = ?
       AND DATE(scheduled_at) = ?
       AND status NOT IN ('cancelled', 'cancelled_late')`,
      [doctorId, date]
    );

    const bookedSlots = new Set(
      existingAppointments.map(apt => {
        const aptDate = new Date(apt.scheduled_at);
        return `${aptDate.getHours().toString().padStart(2, '0')}:${aptDate.getMinutes().toString().padStart(2, '0')}`;
      })
    );

    const slots = [];
    let currentHour = startHour;
    let currentMinute = startMinute;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    selectedDate.setHours(0, 0, 0, 0);

    const isToday = selectedDate.getTime() === today.getTime();
    const MIN_BOOKING_ADVANCE_MINUTES = 30;
    const MAX_PAST_BOOKING_MINUTES = 60;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      let isAvailable = !bookedSlots.has(timeSlot);

      // Apply time-based blocking for today
      if (isToday && isAvailable) {
        const slotDateTime = new Date(year, month - 1, day, currentHour, currentMinute, 0);
        const minutesUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60);

        if (user?.role === 'client' && minutesUntilSlot < MIN_BOOKING_ADVANCE_MINUTES) {
          isAvailable = false;
        } else if (user?.role !== 'client' && minutesUntilSlot < -MAX_PAST_BOOKING_MINUTES) {
          isAvailable = false;
        }
      }

      slots.push({
        time: timeSlot,
        available: isAvailable,
      });

      currentMinute += 60;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  }

  /**
   * Get doctor's working hours for a specific day
   *
   * @param {number} doctorId
   * @param {string} dayName - Day name (monday, tuesday, etc.)
   * @returns {Promise<{start_time: string, end_time: string}|null>}
   */
  async getDoctorWorkingHours(doctorId, dayName) {
    const [workingHours] = await pool.query(
      `SELECT start_time, end_time FROM working_hours
       WHERE doctor_user_id = ? AND day_of_week = ? AND is_active = TRUE`,
      [doctorId, dayName]
    );

    return workingHours.length > 0 ? workingHours[0] : null;
  }

  /**
   * Get schedule override for a specific date
   *
   * @param {number} doctorId
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{start_time: string, end_time: string}|null>}
   */
  async getScheduleOverride(doctorId, date) {
    const [scheduleOverride] = await pool.query(
      `SELECT start_time, end_time, status
       FROM schedules
       WHERE doctor_user_id = ?
       AND date = ?
       AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 1`,
      [doctorId, date]
    );

    return scheduleOverride.length > 0 ? scheduleOverride[0] : null;
  }

  /**
   * Get working time range for all active doctors on a specific date
   * Returns earliest start time and latest end time across all doctors
   * Priority: schedules (date-specific) > working_hours (default)
   *
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{startTime: string|null, endTime: string|null, hasDoctors: boolean}>}
   */
  async getAllDoctorsTimeRange(date) {
    const [doctors] = await pool.query(
      `SELECT u.id FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'doctor' AND u.is_active = TRUE`
    );

    if (doctors.length === 0) {
      return { startTime: null, endTime: null, hasDoctors: false };
    }

    const doctorIds = doctors.map(d => d.id);

    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const [scheduleOverrides] = await pool.query(
      `SELECT doctor_user_id, start_time, end_time
       FROM schedules
       WHERE doctor_user_id IN (?) AND date = ? AND status = 'approved'
       AND NOT (start_time = '00:00:00' AND end_time = '00:00:00')`,
      [doctorIds, date]
    );

    const doctorsWithOverrides = new Set(scheduleOverrides.map(s => s.doctor_user_id));

    const doctorsWithoutOverrides = doctorIds.filter(id => !doctorsWithOverrides.has(id));
    let workingHours = [];

    if (doctorsWithoutOverrides.length > 0) {
      const [wh] = await pool.query(
        `SELECT doctor_user_id, start_time, end_time
         FROM working_hours
         WHERE doctor_user_id IN (?) AND day_of_week = ? AND is_active = TRUE`,
        [doctorsWithoutOverrides, dayName]
      );
      workingHours = wh;
    }

    const allTimeRanges = [
      ...scheduleOverrides.map(s => ({ start: s.start_time, end: s.end_time })),
      ...workingHours.map(wh => ({ start: wh.start_time, end: wh.end_time }))
    ];

    if (allTimeRanges.length === 0) {
      return { startTime: null, endTime: null, hasDoctors: false };
    }

    const startTime = allTimeRanges.reduce((min, range) =>
      range.start < min ? range.start : min,
      allTimeRanges[0].start
    );

    const endTime = allTimeRanges.reduce((max, range) =>
      range.end > max ? range.end : max,
      allTimeRanges[0].end
    );

    return { startTime, endTime, hasDoctors: true };
  }

  /**
   * Get doctors working at a specific time slot
   * Returns list of doctors with their availability status
   *
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} time - Time in HH:MM format
   * @returns {Promise<Array<{doctorId: number, doctorName: string, isAvailable: boolean}>>}
   */
  async getDoctorsForSlot(date, time) {
    const [doctors] = await pool.query(
      `SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'doctor' AND u.is_active = TRUE`
    );

    if (doctors.length === 0) {
      return [];
    }

    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
    const result = [];

    for (const doctor of doctors) {
      const [scheduleOverride] = await pool.query(
        `SELECT start_time, end_time
         FROM schedules
         WHERE doctor_user_id = ? AND date = ? AND status = 'approved'
         ORDER BY created_at DESC
         LIMIT 1`,
        [doctor.id, date]
      );

      let startTime, endTime;

      if (scheduleOverride.length > 0) {
        startTime = scheduleOverride[0].start_time;
        endTime = scheduleOverride[0].end_time;

        // Day off
        if (startTime === '00:00:00' && endTime === '00:00:00') {
          continue;
        }
      } else {
        const [workingHours] = await pool.query(
          `SELECT start_time, end_time
           FROM working_hours
           WHERE doctor_user_id = ? AND day_of_week = ? AND is_active = TRUE`,
          [doctor.id, dayName]
        );

        if (workingHours.length === 0) {
          continue;
        }

        startTime = workingHours[0].start_time;
        endTime = workingHours[0].end_time;
      }

      if (timeWithSeconds >= startTime && timeWithSeconds < endTime) {
        const mysqlDatetime = `${date} ${timeWithSeconds}`;
        const [appointments] = await pool.query(
          `SELECT id FROM appointments
           WHERE doctor_user_id = ? AND scheduled_at = ?
           AND status NOT IN ('cancelled', 'cancelled_late')`,
          [doctor.id, mysqlDatetime]
        );

        result.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          isAvailable: appointments.length === 0
        });
      }
    }

    return result;
  }

  /**
   * Get working time range for a specific doctor on a specific date
   * Returns start and end time for the doctor
   * Priority: schedules (date-specific) > working_hours (default)
   *
   * @param {number} doctorId - Doctor's user ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{startTime: string|null, endTime: string|null, isWorking: boolean}>}
   */
  async getDoctorTimeRange(doctorId, date) {
    const [doctors] = await pool.query(
      `SELECT u.id, u.is_active FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'doctor'`,
      [doctorId]
    );

    if (doctors.length === 0) {
      throw new NotFoundError('Doctor not found');
    }

    if (!doctors[0].is_active) {
      return { startTime: null, endTime: null, isWorking: false };
    }

    const [scheduleOverride] = await pool.query(
      `SELECT start_time, end_time
       FROM schedules
       WHERE doctor_user_id = ? AND date = ? AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 1`,
      [doctorId, date]
    );

    if (scheduleOverride.length > 0) {
      const { start_time, end_time } = scheduleOverride[0];

      // Check if it's a day off
      if (start_time === '00:00:00' && end_time === '00:00:00') {
        return { startTime: null, endTime: null, isWorking: false };
      }

      return { startTime: start_time, endTime: end_time, isWorking: true };
    }

    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const [workingHours] = await pool.query(
      `SELECT start_time, end_time
       FROM working_hours
       WHERE doctor_user_id = ? AND day_of_week = ? AND is_active = TRUE`,
      [doctorId, dayName]
    );

    if (workingHours.length === 0) {
      return { startTime: null, endTime: null, isWorking: false };
    }

    const { start_time, end_time } = workingHours[0];
    return { startTime: start_time, endTime: end_time, isWorking: true };
  }
}

module.exports = new SlotAvailabilityService();
