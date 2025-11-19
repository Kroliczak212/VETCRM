const { pool } = require('../config/database');

class DashboardService {
  /**
   * Get statistics for Admin Dashboard
   * @returns {Object} Admin statistics
   */
  async getAdminStatistics() {
    const connection = await pool.getConnection();
    try {
      // Total staff count (excluding clients - role_id != 4)
      const [staffCount] = await connection.query(
        'SELECT COUNT(*) as total FROM users WHERE role_id != 4'
      );

      // Active doctors count
      const [doctorsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM users WHERE role_id = 3'
      );

      // Total appointments
      const [appointmentsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments'
      );

      // Total revenue from payments (only paid)
      const [revenue] = await connection.query(
        'SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE status = "paid"'
      );

      // Appointments by status
      const [appointmentsByStatus] = await connection.query(`
        SELECT
          status,
          COUNT(*) as count
        FROM appointments
        GROUP BY status
      `);

      // Recent activity (last 10 appointments)
      const [recentActivity] = await connection.query(`
        SELECT
          a.id,
          a.status,
          a.scheduled_at,
          a.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as client_name,
          p.name as pet_name,
          CONCAT(d.first_name, ' ', d.last_name) as doctor_name
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users u ON p.owner_user_id = u.id
        JOIN users d ON a.doctor_user_id = d.id
        ORDER BY a.created_at DESC
        LIMIT 10
      `);

      // Monthly revenue trend (last 6 months)
      const [monthlyRevenue] = await connection.query(`
        SELECT
          DATE_FORMAT(payment_date, '%Y-%m') as month,
          SUM(amount_paid) as revenue
        FROM payments
        WHERE status = 'paid'
          AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
        ORDER BY month
      `);

      return {
        totalStaff: staffCount[0].total,
        activeDoctors: doctorsCount[0].total,
        totalAppointments: appointmentsCount[0].total,
        totalRevenue: parseFloat(revenue[0].total),
        appointmentsByStatus,
        recentActivity,
        monthlyRevenue,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Receptionist Dashboard
   * @returns {Object} Receptionist statistics
   */
  async getReceptionistStatistics() {
    const connection = await pool.getConnection();
    try {
      const today = new Date().toISOString().split('T')[0];

      // Appointments today
      const [todayAppointments] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments WHERE DATE(scheduled_at) = ?',
        [today]
      );

      // Pending appointments (proposed or confirmed for today)
      const [pendingAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE DATE(scheduled_at) = ?
          AND status IN ('proposed', 'confirmed')
      `, [today]);

      // New clients this month
      const [newClients] = await connection.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE role_id = 4
          AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      `);

      // Today's appointments list with details
      const [appointmentsList] = await connection.query(`
        SELECT
          a.id,
          a.scheduled_at,
          a.status,
          a.duration_minutes,
          a.reason,
          p.name as pet_name,
          p.species,
          CONCAT(client.first_name, ' ', client.last_name) as client_name,
          client.phone as client_phone,
          CONCAT(doctor.first_name, ' ', doctor.last_name) as doctor_name
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users client ON p.owner_user_id = client.id
        JOIN users doctor ON a.doctor_user_id = doctor.id
        WHERE DATE(a.scheduled_at) = ?
        ORDER BY a.scheduled_at ASC
      `, [today]);

      // Unpaid payments count
      const [unpaidPayments] = await connection.query(
        'SELECT COUNT(*) as total FROM payments WHERE status IN ("unpaid", "partially_paid")'
      );

      return {
        todayAppointments: todayAppointments[0].total,
        pendingAppointments: pendingAppointments[0].total,
        newClientsThisMonth: newClients[0].total,
        unpaidPayments: unpaidPayments[0].total,
        appointmentsList,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Doctor Dashboard
   * @param {number} doctorId - Doctor user ID
   * @returns {Object} Doctor statistics
   */
  async getDoctorStatistics(doctorId) {
    const connection = await pool.getConnection();
    try {
      const today = new Date().toISOString().split('T')[0];

      // Today's appointments for this doctor
      const [todayAppointments] = await connection.query(
        'SELECT COUNT(*) as total FROM appointments WHERE doctor_user_id = ? AND DATE(scheduled_at) = ?',
        [doctorId, today]
      );

      // Completed appointments today
      const [completedToday] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE doctor_user_id = ?
          AND DATE(scheduled_at) = ?
          AND status = 'completed'
      `, [doctorId, today]);

      // Upcoming appointments today
      const [upcomingToday] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments
        WHERE doctor_user_id = ?
          AND DATE(scheduled_at) = ?
          AND status IN ('proposed', 'confirmed', 'in_progress')
      `, [doctorId, today]);

      // Today's appointments list
      const [appointmentsList] = await connection.query(`
        SELECT
          a.id,
          a.scheduled_at,
          a.status,
          a.duration_minutes,
          a.reason,
          a.location,
          p.id as pet_id,
          p.name as pet_name,
          p.species,
          p.breed,
          CONCAT(client.first_name, ' ', client.last_name) as client_name,
          client.phone as client_phone,
          client.email as client_email
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users client ON p.owner_user_id = client.id
        WHERE a.doctor_user_id = ? AND DATE(a.scheduled_at) = ?
        ORDER BY a.scheduled_at ASC
      `, [doctorId, today]);

      // Total patients treated (unique pets)
      const [totalPatients] = await connection.query(`
        SELECT COUNT(DISTINCT pet_id) as total
        FROM appointments
        WHERE doctor_user_id = ?
      `, [doctorId]);

      // This week's statistics
      const [weekStats] = await connection.query(`
        SELECT
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_appointments
        FROM appointments
        WHERE doctor_user_id = ?
          AND scheduled_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
          AND scheduled_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
      `, [doctorId]);

      return {
        todayAppointments: todayAppointments[0].total,
        completedToday: completedToday[0].total,
        upcomingToday: upcomingToday[0].total,
        totalPatients: totalPatients[0].total,
        weekTotalAppointments: weekStats[0].total_appointments || 0,
        weekCompletedAppointments: weekStats[0].completed_appointments || 0,
        appointmentsList,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics for Client Dashboard
   * @param {number} clientId - Client user ID
   * @returns {Object} Client statistics
   */
  async getClientStatistics(clientId) {
    const connection = await pool.getConnection();
    try {
      // Total pets
      const [petsCount] = await connection.query(
        'SELECT COUNT(*) as total FROM pets WHERE owner_user_id = ?',
        [clientId]
      );

      // Upcoming appointments
      const [upcomingAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE p.owner_user_id = ?
          AND a.scheduled_at >= NOW()
          AND a.status NOT IN ('cancelled', 'cancelled_late', 'completed')
      `, [clientId]);

      // Total appointments
      const [totalAppointments] = await connection.query(`
        SELECT COUNT(*) as total
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE p.owner_user_id = ?
      `, [clientId]);

      // Unpaid bills
      const [unpaidBills] = await connection.query(`
        SELECT COUNT(*) as total, COALESCE(SUM(amount_due - amount_paid), 0) as amount
        FROM payments pay
        JOIN appointments a ON pay.appointment_id = a.id
        JOIN pets p ON a.pet_id = p.id
        WHERE p.owner_user_id = ?
          AND pay.status IN ('unpaid', 'partially_paid')
      `, [clientId]);

      return {
        totalPets: petsCount[0].total,
        upcomingAppointments: upcomingAppointments[0].total,
        totalAppointments: totalAppointments[0].total,
        unpaidBills: unpaidBills[0].total,
        unpaidAmount: parseFloat(unpaidBills[0].amount),
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new DashboardService();
