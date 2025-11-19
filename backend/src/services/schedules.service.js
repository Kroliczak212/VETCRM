const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

class SchedulesService {
  async getAll(query) {
    const { doctorId, date, startDate, endDate } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (doctorId) {
      whereClause += ' AND s.doctor_user_id = ?';
      params.push(doctorId);
    }
    if (date) {
      whereClause += ' AND s.date = ?';
      params.push(date);
    }
    if (startDate && endDate) {
      whereClause += ' AND s.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [schedules] = await pool.query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) as doctor_name
       FROM schedules s
       JOIN users u ON s.doctor_user_id = u.id
       ${whereClause}
       ORDER BY s.date, s.start_time`,
      params
    );

    return schedules;
  }

  async getById(scheduleId) {
    const [schedules] = await pool.query(
      `SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) as doctor_name
       FROM schedules s
       JOIN users u ON s.doctor_user_id = u.id
       WHERE s.id = ?`,
      [scheduleId]
    );

    if (schedules.length === 0) {
      throw new NotFoundError('Schedule');
    }

    return schedules[0];
  }

  async create(data, user) {
    const { doctorId, date, startTime, endTime, isRecurring, repeatPattern, notes } = data;

    // All schedules are auto-approved (doctors manage their own time)
    const status = 'approved';
    const requestedByUserId = user.id;
    const approvedByUserId = user.id; // Self-approved

    const [result] = await pool.query(
      `INSERT INTO schedules (doctor_user_id, date, start_time, end_time, is_recurring, repeat_pattern, status, requested_by_user_id, approved_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doctorId, date, startTime, endTime, isRecurring || 0, repeatPattern || null, status, requestedByUserId, approvedByUserId, notes || null]
    );

    return this.getById(result.insertId);
  }

  async update(scheduleId, data) {
    const { date, startTime, endTime, isRecurring, repeatPattern } = data;

    await this.getById(scheduleId);

    const updates = [];
    const params = [];

    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (startTime !== undefined) {
      updates.push('start_time = ?');
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push('end_time = ?');
      params.push(endTime);
    }
    if (isRecurring !== undefined) {
      updates.push('is_recurring = ?');
      params.push(isRecurring ? 1 : 0);
    }
    if (repeatPattern !== undefined) {
      updates.push('repeat_pattern = ?');
      params.push(repeatPattern);
    }

    if (updates.length > 0) {
      params.push(scheduleId);
      await pool.query(
        `UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getById(scheduleId);
  }

  async delete(scheduleId) {
    await this.getById(scheduleId);
    await pool.query('DELETE FROM schedules WHERE id = ?', [scheduleId]);
    return { message: 'Schedule deleted successfully' };
  }

  async approve(scheduleId, status, approvedBy, notes) {
    await this.getById(scheduleId);

    const updates = ['status = ?', 'approved_by_user_id = ?'];
    const params = [status, approvedBy];

    if (notes) {
      updates.push('notes = CONCAT(IFNULL(notes, ""), ?)');
      params.push(`\n[Admin: ${notes}]`);
    }

    params.push(scheduleId);

    await pool.query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(scheduleId);
  }

  /**
   * Get doctor's calendar - merged view of working_hours + schedules
   * Shows what hours the doctor is working each day in a date range
   */
  async getCalendar(doctorId, startDate, endDate) {
    // Get all approved schedules in the date range
    const [schedules] = await pool.query(
      `SELECT date, start_time, end_time, notes
       FROM schedules
       WHERE doctor_user_id = ? AND date BETWEEN ? AND ? AND status = 'approved'
       ORDER BY date`,
      [doctorId, startDate, endDate]
    );

    // Get doctor's default working hours
    const [workingHours] = await pool.query(
      `SELECT day_of_week, start_time, end_time
       FROM working_hours
       WHERE doctor_user_id = ? AND is_active = TRUE`,
      [doctorId]
    );

    // Create a map of working hours by day
    const workingHoursMap = {};
    workingHours.forEach(wh => {
      workingHoursMap[wh.day_of_week] = {
        start_time: wh.start_time,
        end_time: wh.end_time
      };
    });

    // Create a map of schedule overrides by date
    const schedulesMap = {};
    schedules.forEach(s => {
      // Normalize date format from MySQL to YYYY-MM-DD (using local timezone)
      let dateStr;
      if (s.date instanceof Date) {
        const year = s.date.getFullYear();
        const month = String(s.date.getMonth() + 1).padStart(2, '0');
        const day = String(s.date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      } else if (typeof s.date === 'string') {
        dateStr = s.date.split('T')[0];
      } else {
        dateStr = s.date;
      }

      schedulesMap[dateStr] = {
        start_time: s.start_time,
        end_time: s.end_time,
        notes: s.notes
      };
      console.log('Schedule override:', dateStr, s.start_time, '-', s.end_time);
    });

    // Generate calendar for date range
    const calendar = [];
    // Parse dates in local timezone to avoid UTC conversion issues
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const current = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    while (current <= end) {
      // Format date as YYYY-MM-DD in local timezone
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = current.getDay();
      const dayName = dayNames[dayOfWeek];

      let dayInfo = {
        date: dateStr,
        day_name: dayName,
        is_working: false,
        start_time: null,
        end_time: null,
        source: 'none',
        notes: null
      };

      // Check if there's a schedule override for this date
      if (schedulesMap[dateStr]) {
        const override = schedulesMap[dateStr];
        dayInfo.is_working = override.start_time !== '00:00:00' || override.end_time !== '00:00:00';
        dayInfo.start_time = override.start_time;
        dayInfo.end_time = override.end_time;
        dayInfo.source = 'schedule';
        dayInfo.notes = override.notes;
        console.log('Applied schedule override for', dateStr);
      }
      // Otherwise use default working hours
      else if (workingHoursMap[dayName]) {
        const wh = workingHoursMap[dayName];
        dayInfo.is_working = true;
        dayInfo.start_time = wh.start_time;
        dayInfo.end_time = wh.end_time;
        dayInfo.source = 'working_hours';
      }

      calendar.push(dayInfo);
      current.setDate(current.getDate() + 1);
    }

    return calendar;
  }
}

module.exports = new SchedulesService();
