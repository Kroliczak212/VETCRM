const { pool } = require('../config/database');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

/**
 * Working Hours Service
 * Manages DEFAULT working hours for doctors (admin-managed)
 * These are recurring weekly schedules (e.g., "Mon-Fri 8:00-16:00")
 *
 * NOTE: For date-specific overrides, use SchedulesService
 */
class WorkingHoursService {
  /**
   * Get all working hours with optional filters
   * @param {Object} query - { doctorId, dayOfWeek, isActive }
   */
  async getAll(query) {
    const { doctorId, dayOfWeek, isActive } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (doctorId) {
      whereClause += ' AND wh.doctor_user_id = ?';
      params.push(doctorId);
    }
    if (dayOfWeek) {
      whereClause += ' AND wh.day_of_week = ?';
      params.push(dayOfWeek);
    }
    if (isActive !== undefined) {
      whereClause += ' AND wh.is_active = ?';
      params.push(isActive === 'true' || isActive === true ? 1 : 0);
    }

    const [workingHours] = await pool.query(
      `SELECT wh.*,
              CONCAT(u.first_name, ' ', u.last_name) as doctor_name,
              u.is_active as doctor_is_active
       FROM working_hours wh
       JOIN users u ON wh.doctor_user_id = u.id
       ${whereClause}
       ORDER BY u.last_name, u.first_name,
                FIELD(wh.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
                wh.start_time`,
      params
    );

    return workingHours;
  }

  /**
   * Get working hours by ID
   */
  async getById(workingHourId) {
    const [workingHours] = await pool.query(
      `SELECT wh.*,
              CONCAT(u.first_name, ' ', u.last_name) as doctor_name,
              u.is_active as doctor_is_active
       FROM working_hours wh
       JOIN users u ON wh.doctor_user_id = u.id
       WHERE wh.id = ?`,
      [workingHourId]
    );

    if (workingHours.length === 0) {
      throw new NotFoundError('Working hours');
    }

    return workingHours[0];
  }

  /**
   * Get working hours for a specific doctor
   * Returns organized by day of week
   */
  async getByDoctorId(doctorId) {
    const workingHours = await this.getAll({ doctorId, isActive: true });

    const byDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    workingHours.forEach(wh => {
      byDay[wh.day_of_week].push(wh);
    });

    return byDay;
  }

  /**
   * Create new working hours entry
   * Admin only - sets doctor's default weekly schedule
   */
  async create(data) {
    const { doctorUserId, dayOfWeek, startTime, endTime, isActive = true } = data;

    const [doctors] = await pool.query(
      `SELECT u.id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = ?`,
      [doctorUserId, 'doctor']
    );

    if (doctors.length === 0) {
      throw new ValidationError('User is not a doctor');
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(dayOfWeek)) {
      throw new ValidationError(`Invalid day of week. Must be one of: ${validDays.join(', ')}`);
    }

    // Validate time format - accept both HH:MM and HH:MM:SS
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new ValidationError('Invalid time format. Use HH:MM or HH:MM:SS (e.g., 08:00 or 08:00:00)');
    }

    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    if (formattedStartTime >= formattedEndTime) {
      throw new ValidationError('Start time must be before end time');
    }

    const [overlaps] = await pool.query(
      `SELECT id FROM working_hours
       WHERE doctor_user_id = ?
       AND day_of_week = ?
       AND is_active = TRUE
       AND (
         (start_time <= ? AND end_time > ?) OR
         (start_time < ? AND end_time >= ?) OR
         (start_time >= ? AND end_time <= ?)
       )`,
      [doctorUserId, dayOfWeek, formattedStartTime, formattedStartTime, formattedEndTime, formattedEndTime, formattedStartTime, formattedEndTime]
    );

    if (overlaps.length > 0) {
      throw new ConflictError('Overlapping working hours already exist for this day');
    }

    const [result] = await pool.query(
      `INSERT INTO working_hours (doctor_user_id, day_of_week, start_time, end_time, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [doctorUserId, dayOfWeek, formattedStartTime, formattedEndTime, isActive ? 1 : 0]
    );

    return this.getById(result.insertId);
  }

  /**
   * Bulk create working hours for multiple days
   * Convenient for setting up "Mon-Fri 8:00-16:00"
   */
  async bulkCreate(data) {
    const { doctorUserId, days, startTime, endTime, isActive = true } = data;

    const results = [];
    const errors = [];

    for (const day of days) {
      try {
        const workingHour = await this.create({
          doctorUserId,
          dayOfWeek: day,
          startTime,
          endTime,
          isActive
        });
        results.push(workingHour);
      } catch (error) {
        errors.push({ day, error: error.message });
      }
    }

    return {
      success: results,
      errors: errors.length > 0 ? errors : null,
      message: `Created ${results.length} working hour entries${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  }

  /**
   * Update working hours entry
   */
  async update(workingHourId, data) {
    const { dayOfWeek, startTime, endTime, isActive } = data;

    const existing = await this.getById(workingHourId);

    const updates = [];
    const params = [];

    if (dayOfWeek !== undefined) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (!validDays.includes(dayOfWeek)) {
        throw new ValidationError(`Invalid day of week. Must be one of: ${validDays.join(', ')}`);
      }
      updates.push('day_of_week = ?');
      params.push(dayOfWeek);
    }

    if (startTime !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!timeRegex.test(startTime)) {
        throw new ValidationError('Invalid start time format. Use HH:MM or HH:MM:SS');
      }
      const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
      updates.push('start_time = ?');
      params.push(formattedStartTime);
    }

    if (endTime !== undefined) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!timeRegex.test(endTime)) {
        throw new ValidationError('Invalid end time format. Use HH:MM or HH:MM:SS');
      }
      const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
      updates.push('end_time = ?');
      params.push(formattedEndTime);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    const finalStartTime = startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : existing.start_time;
    const finalEndTime = endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : existing.end_time;
    if (finalStartTime >= finalEndTime) {
      throw new ValidationError('Start time must be before end time');
    }

    if (updates.length > 0) {
      params.push(workingHourId);
      await pool.query(
        `UPDATE working_hours SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );
    }

    return this.getById(workingHourId);
  }

  /**
   * Delete working hours entry
   * Soft delete - sets is_active = FALSE
   */
  async delete(workingHourId) {
    await this.getById(workingHourId);

    await pool.query(
      'UPDATE working_hours SET is_active = FALSE WHERE id = ?',
      [workingHourId]
    );

    return { message: 'Working hours deactivated successfully' };
  }

  /**
   * Hard delete - permanently remove
   * Use with caution - only for cleaning up mistakes
   */
  async hardDelete(workingHourId) {
    await this.getById(workingHourId);

    await pool.query('DELETE FROM working_hours WHERE id = ?', [workingHourId]);

    return { message: 'Working hours deleted permanently' };
  }
}

module.exports = new WorkingHoursService();
